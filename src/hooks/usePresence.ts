import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/config';

const PRESENCE_COLLECTION = 'presence';

/** How often the client refreshes its "last seen" timestamp. */
const HEARTBEAT_MS = 45_000;

/**
 * A presence record counts as online only if it was refreshed within this
 * window. Firestore has no `onDisconnect` (that is a Realtime Database
 * feature), so liveness is derived from the server timestamp instead — which
 * also self-heals when a client crashes without unregistering.
 */
const ONLINE_WINDOW_MS = 120_000;

export interface PresenceState {
  /** Number of distinct users currently considered online. */
  onlineCount: number;
  onlineUserIds: string[];
  /** True once the first presence snapshot has been received. */
  ready: boolean;
  error: string | null;
}

function isRecentlySeen(lastSeen: unknown, now: number): boolean {
  if (typeof lastSeen !== 'object' || lastSeen === null) return false;
  const millis = (lastSeen as { toMillis?: () => number }).toMillis;
  if (typeof millis !== 'function') return false;
  return now - (millis as () => number)() < ONLINE_WINDOW_MS;
}

export function usePresence(user: User | null | undefined): PresenceState {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseFirestore();
    const ownRef = doc(db, PRESENCE_COLLECTION, user.uid);

    const publishOnline = () => {
      setDoc(
        ownRef,
        {
          uid: user.uid,
          displayName: user.displayName ?? 'Anonymous',
          photoURL: user.photoURL ?? '',
          online: true,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {
        // Presence is best-effort; a failed write must never break the chat.
      });
    };

    const publishOffline = () => {
      setDoc(ownRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(
        () => {}
      );
    };

    publishOnline();
    const heartbeat = window.setInterval(publishOnline, HEARTBEAT_MS);

    const markOffline = () => publishOffline();
    window.addEventListener('pagehide', markOffline);

    const q = query(collection(db, PRESENCE_COLLECTION), where('online', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const ids = snapshot.docs
          .map((d) => ({ id: d.id, data: d.data() as { lastSeen?: unknown } }))
          .filter(({ data }) => isRecentlySeen(data.lastSeen, now))
          .map(({ id }) => id);

        setOnlineUserIds(ids);
        setReady(true);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load presence.');
      }
    );

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', markOffline);
      unsubscribe();
      publishOffline();
    };
  }, [user]);

  return { onlineCount: onlineUserIds.length, onlineUserIds, ready, error };
}
