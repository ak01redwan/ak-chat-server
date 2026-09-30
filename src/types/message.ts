import type { Timestamp } from 'firebase/firestore';

/** Emoji -> list of user ids that reacted. Persisted on the message doc. */
export type MessageReactions = Record<string, string[]>;

/** The quoted message preview attached to a reply. */
export interface ReplyTo {
  id: string;
  text: string;
  displayName: string | null;
}

/** A single chat message as stored in and read from Firestore. */
export interface ChatMessage {
  id: string;
  text: string;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp | null;
  replyTo?: ReplyTo | null;
  reactions?: MessageReactions;
  /** True while the client is optimistically showing its own pending write. */
  pending?: boolean;
}
