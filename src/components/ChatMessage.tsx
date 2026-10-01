import { memo, useState } from 'react';
import type { ChatMessage as ChatMessageModel } from '../types/message';
import { useT } from '../i18n';
import {
  formatMessageDate,
  formatMessageTime,
  formatTimeAgo,
  MAX_MESSAGE_LENGTH,
  replyPreview,
  sanitizePhotoURL,
  sanitizeReplyTo,
  validateMessage,
} from '../utils/validation';
import MessageActions from './MessageActions';
import ReactionsBar from './ReactionsBar';

interface ChatMessageProps {
  message: ChatMessageModel;
  isOwn: boolean;
  /** The signed-in user's id, used to highlight their own reactions. */
  currentUserId?: string;
  onCopy?: (text: string) => void;
  onReply?: (message: ChatMessageModel) => void;
  onEdit?: (id: string, text: string) => Promise<void> | void;
  onDelete?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
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

function ChatMessage({
  message,
  isOwn,
  currentUserId,
  onCopy,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}: ChatMessageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const t = useT();

  const photoURL = sanitizePhotoURL(message.photoURL);
  const showImage = Boolean(photoURL) && !imageFailed;
  const replyTo = sanitizeReplyTo(message.replyTo);
  const author = message.displayName || t.anonymous;

  function startEditing() {
    setDraft(message.text);
    setEditError(null);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!onEdit) return;
    const result = validateMessage(draft);
    if (!result.valid) {
      setEditError(result.error ?? t.failedToUpdateMessage);
      return;
    }
    if ((result.value as string) === message.text) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      await onEdit(message.id, result.value as string);
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t.failedToUpdateMessage);
    } finally {
      setIsSaving(false);
    }
  }

  const body = (
    <>
      <div className="message__meta">
        <span className="message__author">{author}</span>
        {message.createdAt && (
          <time
            className="message__time"
            data-testid="message-time"
            dateTime={message.createdAt.toDate().toISOString()}
            title={t.messageTimeTitle(
              formatMessageDate(message.createdAt),
              formatMessageTime(message.createdAt),
              formatTimeAgo(message.createdAt)
            )}
          >
            {formatTimeAgo(message.createdAt)}
          </time>
        )}
        {message.pending && <span className="message__pending">{t.sendingDots}</span>}
      </div>

      {isEditing ? (
        <div className="message__edit">
          <textarea
            className="message__edit-input"
            value={draft}
            autoFocus
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label={t.editMessageFrom(author)}
            onChange={(e) => {
              setDraft(e.target.value);
              setEditError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void saveEdit();
              }
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
          {editError && (
            <p className="message__edit-error" role="alert">
              {editError}
            </p>
          )}
          <div className="message__edit-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void saveEdit()}
              disabled={isSaving}
            >
              {isSaving ? t.saving : t.save}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="message__text">{message.text}</p>

          {onToggleReaction && (
            <ReactionsBar
              reactions={message.reactions}
              currentUserId={currentUserId ?? message.uid}
              onToggle={(emoji) => onToggleReaction(message.id, emoji)}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <article
      className={`message ${isOwn ? 'message--own' : 'message--other'}`}
      data-testid={isOwn ? 'message-own' : 'message-other'}
      aria-label={`${t.message} ${t.by} ${author}`}
    >
      <div className="message__avatar" aria-hidden="true">
        {showImage ? (
          <img
            className="message__avatar-img"
            data-testid="message-avatar-img"
            src={photoURL as string}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="message__avatar-fallback" data-testid="message-avatar-fallback">
            {initialsFor(message.displayName)}
          </span>
        )}
      </div>

      <div className="message__column">
        {replyTo && (
          <div className="message__reply-quote" data-testid="message-reply-quote">
            <span className="message__reply-author">{replyTo.displayName || t.anonymous}</span>
            <span className="message__reply-text">{replyPreview(replyTo.text, 90)}</span>
          </div>
        )}

        {body}

        {!isEditing && (onCopy || onReply || (isOwn && (onEdit || onDelete))) && (
          <MessageActions
            isOwn={isOwn}
            onCopy={() => onCopy?.(message.text)}
            onReply={() => onReply?.(message)}
            onEdit={startEditing}
            onDelete={() => onDelete?.(message.id)}
          />
        )}
      </div>
    </article>
  );
}

export default memo(ChatMessage);
