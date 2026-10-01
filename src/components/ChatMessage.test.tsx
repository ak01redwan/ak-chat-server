import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageModel } from '../types/message';

const baseMessage: ChatMessageModel = {
  id: 'msg-1',
  text: 'Hello community!',
  uid: 'user-1',
  displayName: 'Redwan',
  photoURL: null,
  createdAt: new Timestamp(1_700_000_000, 0),
};

const scriptUrl = ['javascript', ':', 'alert(1)'].join('');

describe('ChatMessage', () => {
  it('renders the message text and author', () => {
    render(<ChatMessage message={baseMessage} isOwn={false} />);
    expect(screen.getByText('Hello community!')).toBeInTheDocument();
    expect(screen.getByText('Redwan')).toBeInTheDocument();
  });

  it('falls back to a friendly label for anonymous authors', () => {
    render(<ChatMessage message={{ ...baseMessage, displayName: null }} isOwn={false} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('marks own and other messages with distinct test ids', () => {
    render(<ChatMessage message={baseMessage} isOwn={true} />);
    expect(screen.getByTestId('message-own')).toBeInTheDocument();
  });

  it('renders initials when no photo is available', () => {
    render(<ChatMessage message={baseMessage} isOwn={false} />);
    expect(screen.getByTestId('message-avatar-fallback')).toHaveTextContent('R');
  });

  it('renders the avatar photo when a safe https URL is present', () => {
    render(
      <ChatMessage
        message={{ ...baseMessage, photoURL: 'https://placehold.co/64.png' }}
        isOwn={false}
      />
    );
    expect(screen.getByTestId('message-avatar-img')).toBeInTheDocument();
    expect(screen.queryByTestId('message-avatar-fallback')).not.toBeInTheDocument();
  });

  it('ignores unsanitizable photo URLs (javascript:)', () => {
    render(<ChatMessage message={{ ...baseMessage, photoURL: scriptUrl }} isOwn={false} />);
    expect(screen.queryByTestId('message-avatar-img')).not.toBeInTheDocument();
    expect(screen.getByTestId('message-avatar-fallback')).toBeInTheDocument();
  });

  it('does not render a time element for pending messages', () => {
    render(<ChatMessage message={{ ...baseMessage, createdAt: null }} isOwn={false} />);
    expect(screen.queryByTestId('message-time')).not.toBeInTheDocument();
  });

  it('shows a relative time for messages that have a timestamp', () => {
    render(<ChatMessage message={baseMessage} isOwn={false} />);
    expect(screen.getByTestId('message-time')).toBeInTheDocument();
  });

  describe('reactions', () => {
    it('renders existing reactions with their counts', () => {
      render(
        <ChatMessage
          message={{ ...baseMessage, reactions: { '👍': ['u1', 'u2'] } }}
          isOwn={false}
          currentUserId="u1"
          onToggleReaction={jest.fn()}
        />
      );

      const chip = screen.getByRole('button', { name: /👍 reaction, 2 people, you reacted/ });
      expect(chip).toHaveAttribute('aria-pressed', 'true');
      expect(chip).toHaveTextContent('2');
    });

    it('lets the current user add a reaction from the picker', async () => {
      const user = userEvent.setup();
      const onToggleReaction = jest.fn();

      render(
        <ChatMessage
          message={baseMessage}
          isOwn={false}
          currentUserId="u1"
          onToggleReaction={onToggleReaction}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Add a reaction' }));
      await user.click(screen.getByRole('button', { name: 'React with 👍' }));

      expect(onToggleReaction).toHaveBeenCalledWith('msg-1', '👍');
    });

    it('toggles an existing reaction when the chip is clicked', async () => {
      const user = userEvent.setup();
      const onToggleReaction = jest.fn();

      render(
        <ChatMessage
          message={{ ...baseMessage, reactions: { '🔥': ['u1'] } }}
          isOwn={false}
          currentUserId="u1"
          onToggleReaction={onToggleReaction}
        />
      );

      await user.click(screen.getByRole('button', { name: /🔥 reaction/ }));
      expect(onToggleReaction).toHaveBeenCalledWith('msg-1', '🔥');
    });
  });

  describe('reply quote', () => {
    it('renders the quoted parent message when replying', () => {
      render(
        <ChatMessage
          message={{
            ...baseMessage,
            replyTo: { id: 'm0', text: 'Original message', displayName: 'Sara' },
          }}
          isOwn={false}
        />
      );

      const quote = screen.getByTestId('message-reply-quote');
      expect(quote).toHaveTextContent('Sara');
      expect(quote).toHaveTextContent('Original message');
    });

    it('ignores a malformed reply payload', () => {
      render(
        <ChatMessage
          message={{ ...baseMessage, replyTo: { id: 'm0', text: '', displayName: null } as never }}
          isOwn={false}
        />
      );

      expect(screen.queryByTestId('message-reply-quote')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('hides edit and delete for other people’s messages', () => {
      render(
        <ChatMessage
          message={baseMessage}
          isOwn={false}
          currentUserId="u2"
          onCopy={jest.fn()}
          onReply={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Copy message' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reply to this message' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit your message' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete your message' })).not.toBeInTheDocument();
    });

    it('exposes edit and delete for the author', () => {
      render(
        <ChatMessage
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Edit your message' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete your message' })).toBeInTheDocument();
    });

    it('asks the room to copy the message text', async () => {
      const user = userEvent.setup();
      const onCopy = jest.fn();

      render(<ChatMessage message={baseMessage} isOwn={false} onCopy={onCopy} />);
      await user.click(screen.getByRole('button', { name: 'Copy message' }));

      expect(onCopy).toHaveBeenCalledWith('Hello community!');
    });

    it('starts an inline edit and saves the new text', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn().mockResolvedValue(undefined);

      render(
        <ChatMessage
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit your message' }));
      const editor = screen.getByRole('textbox', { name: /Edit your message/ });

      await user.clear(editor);
      await user.type(editor, 'Updated text');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(onEdit).toHaveBeenCalledWith('msg-1', 'Updated text'));
    });

    it('refuses to save an empty edit', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();

      render(
        <ChatMessage
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit your message' }));
      const editor = screen.getByRole('textbox', { name: /Edit your message/ });
      await user.clear(editor);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('cannot be empty');
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('surfaces a failed edit and keeps the editor open', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn().mockRejectedValue(new Error('permission-denied'));

      render(
        <ChatMessage
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit your message' }));
      const editor = screen.getByRole('textbox', { name: /Edit your message/ });
      await user.clear(editor);
      await user.type(editor, 'Nope');
      // onEdit rejects asynchronously; the error state lands a microtask later.
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Save' }));
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('permission-denied');
      expect(screen.getByRole('textbox', { name: /Edit your message/ })).toBeInTheDocument();
    });

    it('cancels an edit without saving', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();

      render(
        <ChatMessage
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit your message' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByText('Hello community!')).toBeInTheDocument();
    });
  });
});
