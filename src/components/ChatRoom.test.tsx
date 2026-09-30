import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import ChatRoom from './ChatRoom';
import { deleteMessage, editMessage, sendMessage, setMessageReactions } from '../firebase/messages';
import { useMessages } from '../hooks/useMessages';
import type { ChatMessage as ChatMessageModel } from '../types/message';

jest.mock('../firebase/messages', () => ({
  sendMessage: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  setMessageReactions: jest.fn(),
}));

jest.mock('../hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

const mockSendMessage = sendMessage as jest.Mock;
const mockEditMessage = editMessage as jest.Mock;
const mockDeleteMessage = deleteMessage as jest.Mock;
const mockSetMessageReactions = setMessageReactions as jest.Mock;
const mockUseMessages = useMessages as jest.Mock;

const currentUser = { uid: 'user-1', displayName: 'Redwan' } as unknown as User;

function makeMessage(id: string, text: string, uid: string): ChatMessageModel {
  return {
    id,
    text,
    uid,
    displayName: uid === 'user-1' ? 'Redwan' : 'Sara',
    photoURL: null,
    createdAt: new Timestamp(1_700_000_000 + Number.parseInt(id, 10), 0),
  };
}

/** Default hook result so individual tests only override what they care about. */
function stubMessages(overrides: Record<string, unknown> = {}) {
  mockUseMessages.mockReturnValue({
    messages: [],
    loading: false,
    loadingOlder: false,
    error: null,
    hasMore: false,
    loadOlder: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  stubMessages();
});

describe('ChatRoom', () => {
  it('shows a loading state while messages load', () => {
    stubMessages({ loading: true });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading messages.')).toBeInTheDocument();
    expect(screen.getByTestId('chat-skeleton')).toBeInTheDocument();
  });

  it('shows the empty state when there are no messages', () => {
    render(<ChatRoom user={currentUser} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders messages and marks own messages', () => {
    stubMessages({
      messages: [makeMessage('1', 'First', 'other-user'), makeMessage('2', 'Second', 'user-1')],
    });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByTestId('message-own')).toHaveTextContent('Second');
    expect(screen.getByTestId('message-other')).toHaveTextContent('First');
  });

  it('offers a button to load older messages when more exist', () => {
    stubMessages({ messages: [makeMessage('1', 'Old', 'other-user')], hasMore: true });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByRole('button', { name: 'Load earlier messages' })).toBeInTheDocument();
  });

  it('surfaces a subscription error', () => {
    stubMessages({ error: 'permission-denied' });

    render(<ChatRoom user={currentUser} />);
    expect(screen.getByRole('alert')).toHaveTextContent('permission-denied');
  });

  it('disables the send button for empty or whitespace-only drafts', async () => {
    const user = userEvent.setup();
    render(<ChatRoom user={currentUser} />);

    const input = screen.getByLabelText('Message');
    const send = screen.getByRole('button', { name: 'Send message' });

    expect(send).toBeDisabled();

    await user.type(input, '   ');
    expect(send).toBeDisabled();

    await user.type(input, 'Hello');
    expect(send).toBeEnabled();
  });

  it('copies message text to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText },
    });
    stubMessages({ messages: [makeMessage('1', 'Copy me', 'other-user')] });

    render(<ChatRoom user={currentUser} />);
    await user.click(screen.getByRole('button', { name: 'Copy message' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Copy me'));
  });

  it('sends a trimmed message and clears the input', async () => {
    const user = userEvent.setup();
    mockSendMessage.mockResolvedValue(undefined);

    render(<ChatRoom user={currentUser} />);
    const input = screen.getByLabelText('Message');

    await user.type(input, '  Welcome back  ');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(1));
    expect(mockSendMessage).toHaveBeenCalledWith(currentUser, 'Welcome back', null);
    expect(input).toHaveValue('');
  });

  it('surfaces a send error', async () => {
    const user = userEvent.setup();
    mockSendMessage.mockRejectedValue(new Error('permission-denied'));

    render(<ChatRoom user={currentUser} />);
    await user.type(screen.getByLabelText('Message'), 'Hello');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Send message' }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('permission-denied');
  });

  describe('quick emoji', () => {
    it('appends an emoji to the draft without sending', async () => {
      const user = userEvent.setup();
      render(<ChatRoom user={currentUser} />);

      const input = screen.getByLabelText('Message');
      await user.type(input, 'Hi ');
      await user.click(screen.getByRole('button', { name: 'Insert 🔥' }));

      expect(input).toHaveValue('Hi 🔥');
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('replies', () => {
    it('quotes the selected message when sending a reply', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockResolvedValue(undefined);
      stubMessages({ messages: [makeMessage('1', 'Original question', 'other-user')] });

      render(<ChatRoom user={currentUser} />);

      await user.click(screen.getByRole('button', { name: 'Reply to this message' }));
      expect(screen.getByText('Replying to Sara')).toBeInTheDocument();

      await user.type(screen.getByLabelText('Message'), 'An answer');
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(1));
      expect(mockSendMessage).toHaveBeenCalledWith(currentUser, 'An answer', {
        id: '1',
        text: 'Original question',
        displayName: 'Sara',
      });
      expect(screen.queryByText('Replying to Sara')).not.toBeInTheDocument();
    });

    it('cancels a pending reply', async () => {
      const user = userEvent.setup();
      stubMessages({ messages: [makeMessage('1', 'Original question', 'other-user')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Reply to this message' }));
      await user.click(screen.getByRole('button', { name: 'Cancel reply' }));

      expect(screen.queryByText('Replying to Sara')).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('filters the visible messages by text and author', async () => {
      const user = userEvent.setup();
      stubMessages({
        messages: [
          makeMessage('1', 'Hello world', 'other-user'),
          makeMessage('2', 'Second post', 'user-1'),
        ],
      });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Search messages' }));
      await user.type(screen.getByLabelText('Search messages'), 'hello');

      expect(screen.getByText('Hello world')).toBeInTheDocument();
      expect(screen.queryByText('Second post')).not.toBeInTheDocument();
      expect(screen.getByText('1 result')).toBeInTheDocument();
    });

    it('shows a no-matches state and can be closed', async () => {
      const user = userEvent.setup();
      stubMessages({ messages: [makeMessage('1', 'Hello world', 'other-user')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Search messages' }));
      await user.type(screen.getByLabelText('Search messages'), 'zzzz');

      expect(screen.getByText('No matches')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close search' }));
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  describe('reactions', () => {
    it('persists a toggled reaction', async () => {
      const user = userEvent.setup();
      mockSetMessageReactions.mockResolvedValue(undefined);
      stubMessages({ messages: [makeMessage('1', 'React to me', 'other-user')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Add a reaction' }));
      await user.click(screen.getByRole('button', { name: 'React with 🔥' }));

      await waitFor(() =>
        expect(mockSetMessageReactions).toHaveBeenCalledWith('1', { '🔥': ['user-1'] })
      );
    });

    it('surfaces a failed reaction', async () => {
      const user = userEvent.setup();
      mockSetMessageReactions.mockRejectedValue(new Error('write-denied'));
      stubMessages({ messages: [makeMessage('1', 'React to me', 'other-user')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Add a reaction' }));
      await user.click(screen.getByRole('button', { name: 'React with 🔥' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('write-denied');
    });
  });

  describe('deleting', () => {
    it('edits the text of an own message', async () => {
      const user = userEvent.setup();
      mockEditMessage.mockResolvedValue(undefined);
      stubMessages({ messages: [makeMessage('2', 'Mine', 'user-1')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: /edit your message/i }));

      const editor = screen.getByRole('textbox', { name: /edit your message/i });
      await user.clear(editor);
      await user.type(editor, 'Fixed');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(mockEditMessage).toHaveBeenCalledWith('2', 'Fixed'));
    });

    it('asks for confirmation before deleting', async () => {
      const user = userEvent.setup();
      mockDeleteMessage.mockResolvedValue(undefined);
      stubMessages({ messages: [makeMessage('2', 'Mine', 'user-1')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Delete your message' }));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(mockDeleteMessage).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(mockDeleteMessage).toHaveBeenCalledWith('2'));
    });

    it('does not delete when the confirmation is cancelled', async () => {
      const user = userEvent.setup();
      stubMessages({ messages: [makeMessage('2', 'Mine', 'user-1')] });

      render(<ChatRoom user={currentUser} />);
      await user.click(screen.getByRole('button', { name: 'Delete your message' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockDeleteMessage).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('day separators', () => {
    it('groups messages under a day label', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86_400_000);

      stubMessages({
        messages: [
          {
            ...makeMessage('1', 'Yesterday message', 'other-user'),
            createdAt: Timestamp.fromDate(yesterday),
          },
          {
            ...makeMessage('2', 'Today message', 'user-1'),
            createdAt: Timestamp.fromDate(today),
          },
        ],
      });

      render(<ChatRoom user={currentUser} />);
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });
});
