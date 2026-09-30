import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { deleteMessage, editMessage, sendMessage, setMessageReactions } from '../firebase/messages';
import { useMessages } from '../hooks/useMessages';
import {
  formatDayLabel,
  isSameDay,
  MAX_MESSAGE_LENGTH,
  replyPreview,
  toggleReaction,
  validateMessage,
} from '../utils/validation';
import type { ChatMessage as ChatMessageModel, ReplyTo } from '../types/message';
import ChatMessage from './ChatMessage';
import ConfirmationModal from './ConfirmationModal';
import DaySeparator from './DaySeparator';
import { EmptyState, ErrorBanner } from './Feedback';
import SkeletonChat from './SkeletonChat';
import { CloseIcon, SearchIcon, SendIcon } from './icons';

interface ChatRoomProps {
  user: User;
}

const QUICK_EMOJIS = ['😊', '😂', '❤️', '👍', '🔥'];

export default function ChatRoom({ user }: ChatRoomProps) {
  const { messages, loading, loadingOlder, error, hasMore, loadOlder } = useMessages();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessageModel | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
  const pinnedToBottomRef = useRef(true);

  // Track whether the user is at the bottom so we never yank them away from
  // history they are reading; only auto-scroll when they already follow the tail.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    if (lastMessageId && pinnedToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lastMessageId]);

  const visibleMessages = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(term) || (m.displayName ?? '').toLowerCase().includes(term)
    );
  }, [messages, query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateMessage(draft);
    if (!result.valid) {
      setSendError(result.error ?? 'Message is invalid.');
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await sendMessage(user, result.value as string, replyTo);
      setDraft('');
      setReplyTo(null);
      pinnedToBottomRef.current = true;
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleToggleReaction(id: string, emoji: string) {
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    try {
      await setMessageReactions(id, toggleReaction(target.reactions, emoji, user.uid));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Failed to update reaction.');
      window.setTimeout(() => setRowError(null), 3000);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard access can be denied; the message stays selectable either way.
    }
  }

  function startReply(message: ChatMessageModel) {
    setReplyTo({ id: message.id, text: message.text, displayName: message.displayName });
    document.querySelector<HTMLInputElement>('.chat__input')?.focus();
  }

  function requestDelete(id: string) {
    const target = messages.find((m) => m.id === id);
    if (target) setPendingDelete(target);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteMessage(id);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Failed to delete the message.');
      window.setTimeout(() => setRowError(null), 3000);
    }
  }

  const resultCount = searchOpen && query.trim() ? visibleMessages.length : null;

  return (
    <section className="chat" aria-label="Community chat">
      <div className="chat__toolbar">
        <div className="chat__toolbar-info">
          <h2 className="chat__title">Community chat</h2>
          {resultCount !== null && (
            <span className="chat__search-count" role="status">
              {resultCount} {resultCount === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>

        {searchOpen ? (
          <div className="chat__search">
            <SearchIcon size={16} />
            <input
              className="chat__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…"
              aria-label="Search messages"
              autoFocus
            />
            <button
              type="button"
              className="chat__search-close"
              onClick={() => {
                setQuery('');
                setSearchOpen(false);
              }}
              aria-label="Close search"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSearchOpen(true)}
            aria-label="Search messages"
          >
            <SearchIcon size={15} />
            <span className="btn__label">Search</span>
          </button>
        )}
      </div>

      <div className="chat__scroll" ref={scrollRef} onScroll={handleScroll}>
        {hasMore && (
          <button
            className="btn btn--outline chat__older"
            type="button"
            onClick={() => {
              // Keep the reading position stable while older rows are inserted above.
              const el = scrollRef.current;
              const before = el?.scrollHeight ?? 0;
              void loadOlder().then(() => {
                if (el) el.scrollTop += el.scrollHeight - before;
              });
            }}
            disabled={loadingOlder}
          >
            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}

        {error && <ErrorBanner message={error} />}
        {rowError && <ErrorBanner message={rowError} />}

        {loading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Loading messages.</span>
            <SkeletonChat />
          </div>
        ) : resultCount === 0 ? (
          <div className="state">
            <h2 className="state__title">No matches</h2>
            <p className="state__text">Nothing found for “{query.trim()}”.</p>
          </div>
        ) : visibleMessages.length === 0 ? (
          <EmptyState />
        ) : (
          visibleMessages.map((message, index) => {
            const prev = visibleMessages[index - 1];
            const showDay = !prev || !isSameDay(prev.createdAt, message.createdAt);
            return (
              <div key={message.id}>
                {showDay && message.createdAt && (
                  <DaySeparator label={formatDayLabel(message.createdAt)} />
                )}
                <ChatMessage
                  message={message}
                  isOwn={message.uid === user.uid}
                  currentUserId={user.uid}
                  onCopy={handleCopy}
                  onReply={startReply}
                  onEdit={editMessage}
                  onDelete={requestDelete}
                  onToggleReaction={handleToggleReaction}
                />
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat__composer" onSubmit={handleSubmit}>
        {replyTo && (
          <div className="chat__replying">
            <div className="chat__replying-text">
              <strong>Replying to {replyTo.displayName || 'Anonymous'}</strong>
              <span>{replyPreview(replyTo.text, 80)}</span>
            </div>
            <button
              type="button"
              className="chat__replying-cancel"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}

        {sendError && (
          <div className="chat__composer-error" role="alert">
            {sendError}
          </div>
        )}

        <div className="chat__quick" aria-label="Quick emoji">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="chat__quick-btn"
              onClick={() => setDraft((d) => (d + emoji).slice(0, MAX_MESSAGE_LENGTH))}
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="chat__composer-row">
          <input
            className="chat__input"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setSendError(null);
            }}
            placeholder="Write a message…"
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Message"
            autoComplete="off"
            enterKeyHint="send"
          />
          <button
            className="chat__send"
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
          >
            {sending ? (
              <span className="chat__send-spinner" aria-hidden="true" />
            ) : (
              <SendIcon size={18} />
            )}
          </button>
        </div>

        <div className="chat__meta">
          <span className="chat__hint">Enter to send</span>
          <span className="chat__counter" aria-hidden="true">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </form>

      {pendingDelete && (
        <ConfirmationModal
          title="Delete this message?"
          body="This permanently removes the message for everyone in the chat. This cannot be undone."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
