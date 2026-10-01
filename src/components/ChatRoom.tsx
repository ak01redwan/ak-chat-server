import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { deleteMessage, editMessage, sendMessage, setMessageReactions } from '../firebase/messages';
import { useMessages } from '../hooks/useMessages';
import { useT } from '../i18n';
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
  const t = useT();

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
      setSendError(result.error ?? t.failedToSend);
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
      setSendError(err instanceof Error ? err.message : t.failedToSend);
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
      setRowError(err instanceof Error ? err.message : t.failedToUpdateReaction);
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
      setRowError(err instanceof Error ? err.message : t.failedToDelete);
      window.setTimeout(() => setRowError(null), 3000);
    }
  }

  const resultCount = searchOpen && query.trim() ? visibleMessages.length : null;

  return (
    <section className="chat" aria-label={t.communityChat}>
      <div className="chat__toolbar">
        <div className="chat__toolbar-info">
          <h2 className="chat__title">{t.communityChat}</h2>
          {resultCount !== null && (
            <span className="chat__search-count" role="status">
              {resultCount} {resultCount === 1 ? t.results_one : t.results_other}
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
              placeholder={t.searchMessages}
              aria-label={t.searchMessages}
              data-testid="chat-search-input"
              autoFocus
            />
            <button
              type="button"
              className="chat__search-close"
              onClick={() => {
                setQuery('');
                setSearchOpen(false);
              }}
              aria-label={t.closeSearch}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSearchOpen(true)}
            aria-label={t.search}
          >
            <SearchIcon size={15} />
            <span className="btn__label">{t.search}</span>
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
            {loadingOlder ? t.loading : t.loadEarlierMessages}
          </button>
        )}

        {error && <ErrorBanner message={error} />}
        {rowError && <ErrorBanner message={rowError} />}

        {loading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">{t.loadingMessagesSr}</span>
            <SkeletonChat />
          </div>
        ) : resultCount === 0 ? (
          <div className="state">
            <h2 className="state__title">{t.noMatches}</h2>
            <p className="state__text">{t.nothingFoundFor(query.trim())}</p>
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
                  <DaySeparator
                    label={formatDayLabel(message.createdAt, {
                      today: t.today,
                      yesterday: t.yesterday,
                    })}
                  />
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
              <strong>{t.replyingTo(replyTo.displayName || t.anonymous)}</strong>
              <span>{replyPreview(replyTo.text, 80)}</span>
            </div>
            <button
              type="button"
              className="chat__replying-cancel"
              onClick={() => setReplyTo(null)}
              aria-label={t.cancelReply}
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

        <div className="chat__quick" aria-label={t.quickEmoji}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="chat__quick-btn"
              onClick={() => setDraft((d) => (d + emoji).slice(0, MAX_MESSAGE_LENGTH))}
              aria-label={t.insertEmoji(emoji)}
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
            placeholder={t.writeMessage}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label={t.message}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button
            className="chat__send"
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label={t.sendMessage}
          >
            {sending ? (
              <span className="chat__send-spinner" aria-hidden="true" />
            ) : (
              <SendIcon size={18} />
            )}
          </button>
        </div>

        <div className="chat__meta">
          <span className="chat__hint">{t.enterToSend}</span>
          <span className="chat__counter" aria-hidden="true">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </form>

      {pendingDelete && (
        <ConfirmationModal
          title={t.deleteThisMessage}
          body={t.deleteMessageBody}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
