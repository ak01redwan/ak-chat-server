import { useState } from 'react';
import type { ChatMessage as ChatMessageModel } from '../types/message';
import { formatMessageDate, formatMessageTime, sanitizePhotoURL } from '../utils/validation';

interface ChatMessageProps {
  message: ChatMessageModel;
  isOwn: boolean;
}

/** Builds a short avatar placeholder from the author's display name. */
function initialsFor(name: string | null): string {
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return initials || '?';
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoURL = sanitizePhotoURL(message.photoURL);
  const showImage = Boolean(photoURL) && !imageFailed;

  return (
    <article
      className={`message ${isOwn ? 'message--own' : 'message--other'}`}
      data-testid={isOwn ? 'message-own' : 'message-other'}
      aria-label={`Message from ${message.displayName ?? 'Anonymous'}`}
    >
      <div className="message__avatar" aria-hidden="true">
        {showImage ? (
          <img
            className="message__avatar-img"
            data-testid="message-avatar-img"
            src={photoURL as string}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="message__avatar-fallback" data-testid="message-avatar-fallback">
            {initialsFor(message.displayName)}
          </span>
        )}
      </div>

      <div className="message__body">
        <header className="message__meta">
          <span className="message__author">{message.displayName || 'Anonymous'}</span>
          {message.createdAt && (
            <time
              className="message__time"
              data-testid="message-time"
              dateTime={message.createdAt.toDate().toISOString()}
            >
              {formatMessageDate(message.createdAt)} · {formatMessageTime(message.createdAt)}
            </time>
          )}
        </header>
        <p className="message__text">{message.text}</p>
      </div>
    </article>
  );
}
