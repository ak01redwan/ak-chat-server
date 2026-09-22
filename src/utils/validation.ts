import type { Timestamp } from 'firebase/firestore';

export const MAX_MESSAGE_LENGTH = 1000;

export interface ValidationResult {
  valid: boolean;
  value?: string;
  error?: string;
}

/** Trims surrounding whitespace from a raw message input. */
export function normalizeMessageText(raw: string): string {
  return raw.trim();
}

/** Validates a message against the shared rules (mirrors Firestore security rules). */
export function validateMessage(text: string): ValidationResult {
  const normalized = normalizeMessageText(text);

  if (!normalized) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  return { valid: true, value: normalized };
}

/**
 * Restricts profile photo URLs to http(s) with a reasonable length cap.
 * Returns `null` for anything that cannot be used safely as an <img> src.
 * Mirrors the Firestore security-rule validation.
 */
export function sanitizePhotoURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Formats a message timestamp as local time, e.g. "09:41". */
export function formatMessageTime(createdAt: Timestamp | null): string {
  if (!createdAt) return '';
  return createdAt.toDate().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formats a message timestamp as a short date, e.g. "22 Sep". */
export function formatMessageDate(createdAt: Timestamp | null): string {
  if (!createdAt) return '';
  return createdAt.toDate().toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}
