import { render, screen } from '@testing-library/react';
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
});
