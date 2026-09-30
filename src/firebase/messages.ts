import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebaseFirestore } from './config';
import type { MessageReactions } from '../types/message';
import {
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  sanitizePhotoURL,
  validateMessage,
} from '../utils/validation';

export const MESSAGE_PAGE_SIZE = 25;

const MESSAGES_COLLECTION = 'messages';

/** Reference to the `messages` collection. */
export function messagesCollection() {
  return collection(getFirebaseFirestore(), MESSAGES_COLLECTION);
}

/** Reference to a single message document. */
export function messageDocument(messageId: string) {
  return doc(getFirebaseFirestore(), MESSAGES_COLLECTION, messageId);
}

/**
 * Writes a chat message on behalf of the signed-in user.
 * Throws if the message fails validation or the write is rejected.
 */
export async function sendMessage(
  user: User,
  rawText: string,
  replyTo?: { id: string; text: string; displayName: string | null } | null
): Promise<void> {
  const text = normalizeMessageText(rawText);
  const result = validateMessage(text);

  if (!result.valid) {
    throw new Error(result.error ?? 'Message is invalid.');
  }

  await addDoc(messagesCollection(), {
    text,
    uid: user.uid,
    displayName: user.displayName ?? null,
    photoURL: sanitizePhotoURL(user.photoURL),
    createdAt: serverTimestamp(),
    replyTo: replyTo ?? null,
    reactions: {},
  });
}

/** Edits the text of one of the current user's own messages. */
export async function editMessage(messageId: string, rawText: string): Promise<void> {
  const text = normalizeMessageText(rawText);
  const result = validateMessage(text);

  if (!result.valid) {
    throw new Error(result.error ?? 'Message is invalid.');
  }

  await updateDoc(messageDocument(messageId), { text });
}

/** Removes the author's own message entirely. */
export async function deleteMessage(messageId: string): Promise<void> {
  await deleteDoc(messageDocument(messageId));
}

/** Persists a new reactions map on a message (any signed-in user may react). */
export async function setMessageReactions(
  messageId: string,
  reactions: MessageReactions
): Promise<void> {
  await updateDoc(messageDocument(messageId), { reactions });
}

export { MAX_MESSAGE_LENGTH };
