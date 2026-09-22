import { act, renderHook, waitFor } from '@testing-library/react';
import { useMessages } from './useMessages';

interface MockDoc {
  id: string;
  data: () => Record<string, unknown>;
}

interface MockSnapshot {
  docs: MockDoc[];
}

const makeDoc = (id: string, overrides: Record<string, unknown> = {}): MockDoc => ({
  id,
  data: () => ({
    text: 'Hello',
    uid: 'user-1',
    displayName: null,
    photoURL: null,
    createdAt: null,
    ...overrides,
  }),
});

const makeDocs = (count: number, startId = 0): MockDoc[] =>
  Array.from({ length: count }, (_, index) => makeDoc(`id-${startId + index}`));

jest.mock('firebase/firestore', () => {
  class FakeTimestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }

    toMillis() {
      return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
    }
  }

  return {
    Timestamp: FakeTimestamp,
    getFirestore: jest.fn(() => 'mock-firestore'),
    onSnapshot: jest.fn(),
    getDocs: jest.fn(),
    collection: jest.fn(() => ({ path: 'messages' })),
    query: jest.fn((...args: unknown[]) => ({ kind: 'query', args })),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    addDoc: jest.fn(),
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  };
});

const { getDocs, onSnapshot, Timestamp } = jest.requireMock('firebase/firestore') as {
  getDocs: jest.Mock;
  onSnapshot: jest.Mock;
  Timestamp: new (
    seconds: number,
    nanoseconds: number
  ) => { seconds: number; nanoseconds: number; toMillis(): number };
  [key: string]: unknown;
};

/** Returns the latest callback pair captured by the onSnapshot mock. */
function latestCallbacks(): {
  onNext: (snap: MockSnapshot) => void;
  onError: (err: Error) => void;
} {
  const calls = onSnapshot.mock.calls;
  const last = calls[calls.length - 1];
  return {
    onNext: last[1] as (snap: MockSnapshot) => void,
    onError: last[2] as (err: Error) => void,
  };
}

function emitSnapshot(snapshot: MockSnapshot): void {
  const { onNext } = latestCallbacks();
  act(() => onNext(snapshot));
}

beforeEach(() => {
  getDocs.mockReset();
  onSnapshot.mockReset();
  onSnapshot.mockReturnValue(() => {});
});

describe('useMessages', () => {
  it('loads and maps the latest page of messages', () => {
    const { result } = renderHook(() => useMessages());

    emitSnapshot({ docs: [makeDoc('m1')] });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('m1');
    expect(result.current.hasMore).toBe(false);
  });

  it('reports subscription errors', () => {
    const { result } = renderHook(() => useMessages());

    act(() => latestCallbacks().onError(new Error('unavailable')));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('unavailable');
  });

  it('sorts messages oldest-first with pending messages last', () => {
    const { result } = renderHook(() => useMessages());

    emitSnapshot({
      docs: [
        makeDoc('newest', { createdAt: new Timestamp(5000, 0) }),
        makeDoc('pending', { createdAt: null }),
        makeDoc('oldest', { createdAt: new Timestamp(1000, 0) }),
      ],
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(['oldest', 'newest', 'pending']);
  });

  it('exposes a "load older" cursor when the latest page is full', () => {
    const { result } = renderHook(() => useMessages());

    emitSnapshot({ docs: makeDocs(25) });

    expect(result.current.hasMore).toBe(true);
  });

  it('appends older pages via loadOlder and stops when history is exhausted', async () => {
    const { result } = renderHook(() => useMessages());

    emitSnapshot({
      docs: makeDocs(25).map((doc) => ({
        ...doc,
        data: () => ({ ...doc.data(), createdAt: new Timestamp(2000, 0) }),
      })),
    });
    expect(result.current.hasMore).toBe(true);

    getDocs.mockResolvedValueOnce({
      docs: [makeDoc('older-1', { createdAt: new Timestamp(1000, 0) })],
    });

    await act(async () => {
      await result.current.loadOlder();
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(26));
    expect(result.current.hasMore).toBe(false);
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('does nothing when loadOlder is called without a cursor', async () => {
    const { result } = renderHook(() => useMessages());

    emitSnapshot({ docs: [makeDoc('only-one')] });
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadOlder();
    });

    expect(getDocs).not.toHaveBeenCalled();
  });

  it('unsubscribes from the live query on unmount', () => {
    const unsubscribe = jest.fn();
    onSnapshot.mockReturnValueOnce(unsubscribe);

    const { unmount } = renderHook(() => useMessages());
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
