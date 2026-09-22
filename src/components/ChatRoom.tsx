import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { sendMessage } from '../firebase/messages';
import { useMessages } from '../hooks/useMessages';
import { MAX_MESSAGE_LENGTH, validateMessage } from '../utils/validation';
import ChatMessage from './ChatMessage';
import { EmptyState, ErrorBanner, LoadingState } from './Feedback';
import { SendIcon } from './icons';

interface ChatRoomProps {
  user: User;
}

export default function ChatRoom({ user }: ChatRoomProps) {
  const { messages, loading, loadingOlder, error, hasMore, loadOlder } = useMessages();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;

  // Auto-scroll to the newest message whenever the last message changes.
  useEffect(() => {
    if (lastMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [lastMessageId]);

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
      await sendMessage(user, result.value as string);
      setDraft('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="chat" aria-label="Community chat">
      <div className="chat__scroll">
        {hasMore && (
          <button
            className="btn btn--outline chat__older"
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}

        {error && <ErrorBanner message={error} />}

        {loading ? (
          <LoadingState />
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} isOwn={message.uid === user.uid} />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat__composer" onSubmit={handleSubmit}>
        {sendError && (
          <div className="chat__composer-error" role="alert">
            {sendError}
          </div>
        )}

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
            <SendIcon size={18} />
          </button>
        </div>

        <div className="chat__counter" aria-hidden="true">
          {draft.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </form>
    </section>
  );
}
