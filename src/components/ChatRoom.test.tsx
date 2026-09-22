import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import ChatRoom from './ChatRoom';
import { sendMessage } from '../firebase/messages';
import { useMessages } from '../hooks/useMessages';
import type { ChatMessage as ChatMessageModel } from '../types/message';

jest.mock('../firebase/messages', () => ({
  sendMessage: jest.fn(),
}));

jest.mock('../hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

const mockSendMessage = sendMessage as jest.Mock;
const mockUseMessages = useMessages as jest.Mock;

const currentUser = { uid: 'user-1', displayName: 'Redwan' } as unknown as User;

function makeMessage(id: string, text: string, uid: string): ChatMessageModel {
  return {
    id,
    text,
    uid,
    displayName: 'Someone',
    photoURL: null,
    createdAt: new Timestamp(1_700_000_000 + Number.parseInt(id, 10), 0),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChatRoom', () => {
  it('shows a loading state while messages load', () => {
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: true,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the empty state when there are no messages', () => {
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders messages and marks own messages', () => {
    mockUseMessages.mockReturnValue({
      messages: [makeMessage('1', 'First', 'other-user'), makeMessage('2', 'Second', 'user-1')],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByTestId('message-own')).toHaveTextContent('Second');
    expect(screen.getByTestId('message-other')).toHaveTextContent('First');
  });

  it('offers a button to load older messages when more exist', () => {
    mockUseMessages.mockReturnValue({
      messages: [makeMessage('1', 'Old', 'other-user')],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: true,
      loadOlder: jest.fn(),
    });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByRole('button', { name: 'Load earlier messages' })).toBeInTheDocument();
  });

  it('disables the send button for empty or whitespace-only drafts', async () => {
    const user = userEvent.setup();
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });

    render(<ChatRoom user={currentUser} />);
    const input = screen.getByLabelText('Message');
    const send = screen.getByRole('button', { name: 'Send message' });

    expect(send).toBeDisabled();

    await user.type(input, '   ');
    expect(send).toBeDisabled();

    await user.type(input, 'Hello');
    expect(send).toBeEnabled();
  });

  it('sends a trimmed message and clears the input', async () => {
    const user = userEvent.setup();
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });
    mockSendMessage.mockResolvedValue(undefined);

    render(<ChatRoom user={currentUser} />);
    const input = screen.getByLabelText('Message');

    await user.type(input, '  Welcome back  ');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(1));
    expect(mockSendMessage).toHaveBeenCalledWith(currentUser, 'Welcome back');
    expect(input).toHaveValue('');
  });

  it('surfaces a send error', async () => {
    const user = userEvent.setup();
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadingOlder: false,
      error: null,
      hasMore: false,
      loadOlder: jest.fn(),
    });
    mockSendMessage.mockRejectedValue(new Error('permission-denied'));

    render(<ChatRoom user={currentUser} />);
    const input = screen.getByLabelText('Message');

    await user.type(input, 'Hello');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Send message' }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('permission-denied');
  });
});
