import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { MESSAGE_PAGE_SIZE, messagesCollection } from '../firebase/messages';
import type { ChatMessage, MessageReactions, ReplyTo } from '../types/message';
import { sanitizeReplyTo } from '../utils/validation';

/**
 * Reads an untrusted `reactions` map into a clean Record<emoji, uid[]>.
 * Malformed entries (non-list values, non-string uids) are discarded so a
 * corrupted document can never break rendering.
 */
function mapReactions(value: unknown): MessageReactions | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const result: MessageReactions = {};
  for (const [emoji, users] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(users)) continue;
    const ids = users.filter((u): u is string => typeof u === 'string');
    if (ids.length > 0) result[emoji] = ids;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function mapDocument(doc: QueryDocumentSnapshot): ChatMessage {
  const data = doc.data() as Partial<ChatMessage>;
  const replyTo: ReplyTo | null = sanitizeReplyTo(data.replyTo);

  return {
    id: doc.id,
    text: typeof data.text === 'string' ? data.text : '',
    uid: typeof data.uid === 'string' ? data.uid : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    replyTo,
    reactions: mapReactions(data.reactions),
  };
}

/**
 * Sorts messages oldest -> newest for rendering, keeping pending (server timestamp
 * not yet resolved) messages at the bottom.
 */
function sortOldestFirst(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
    const bTime = b.createdAt ? b.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export interface UseMessagesResult {
  messages: ChatMessage[];
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  hasMore: boolean;
  loadOlder: () => Promise<void>;
}

/**
 * Subscribes to the newest page of messages in real time and supports
 * paginating further back in history.
 */
export function useMessages(pageSize: number = MESSAGE_PAGE_SIZE): UseMessagesResult {
  const [latest, setLatest] = useState<ChatMessage[]>([]);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageSizeRef = useRef(pageSize);
  const oldestCursorRef = useRef<DocumentSnapshot | null>(null);
  const initialCursorRef = useRef<DocumentSnapshot | null>(null);
  const paginatedRef = useRef(false);
  const exhaustedRef = useRef(false);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    const q = query(messagesCollection(), orderBy('createdAt', 'desc'), limit(pageSize));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs;
        setLatest(docs.map(mapDocument));

        // Remember where the newest page ends so "load older" can resume from it,
        // even after new messages arrive and shift the live page forward.
        if (!initialCursorRef.current && docs.length > 0) {
          initialCursorRef.current = docs[docs.length - 1];
        }

        const pageFull = docs.length === pageSize;
        setHasMore(pageFull && !exhaustedRef.current);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load messages.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      initialCursorRef.current = null;
      oldestCursorRef.current = null;
      paginatedRef.current = false;
      exhaustedRef.current = false;
    };
  }, [pageSize]);

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || exhaustedRef.current) return;

    const cursor = oldestCursorRef.current ?? initialCursorRef.current;
    if (!cursor) {
      exhaustedRef.current = true;
      setHasMore(false);
      return;
    }

    paginatedRef.current = true;
    setLoadingOlder(true);
    setError(null);
    try {
      const q = query(
        messagesCollection(),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSizeRef.current)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      // A short page means we reached the start of the room's history. Remember
      // that so later live snapshots cannot flip `hasMore` back on and make the
      // reader page through an exhausted history with a stale cursor.
      const more = docs.length === pageSizeRef.current;
      if (more) {
        oldestCursorRef.current = docs[docs.length - 1];
      } else {
        exhaustedRef.current = true;
        oldestCursorRef.current = null;
      }

      if (docs.length > 0) {
        setOlder((previous) => [...previous, ...docs.map(mapDocument)]);
      }
      setHasMore(more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earlier messages.');
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder]);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const message of older) byId.set(message.id, message);
    for (const message of latest) byId.set(message.id, message);
    return sortOldestFirst(Array.from(byId.values()));
  }, [older, latest]);

  return { messages, loading, loadingOlder, error, hasMore, loadOlder };
}
