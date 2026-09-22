import type { Timestamp } from 'firebase/firestore';

/** A single chat message as stored in and read from Firestore. */
export interface ChatMessage {
  id: string;
  text: string;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp | null;
}
