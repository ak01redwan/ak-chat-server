import type { Timestamp } from 'firebase/firestore';
import type { MessageReactions, ReplyTo } from '../types/message';

export const MAX_MESSAGE_LENGTH = 1000;

/** Emojis offered for quick reactions on every message. */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥'] as const;

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
 * Restricts profile photo URLs to https with a reasonable length cap.
 * Returns `null` for anything that cannot be used safely as an <img> src.
 * https-only mirrors the Firestore security-rule validation, and a plaintext
 * avatar would be blocked as mixed content on this https-only site anyway.
 */
export function sanitizePhotoURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Reactions                                                                 */
/* -------------------------------------------------------------------------- */

/** Counts how many users reacted with `emoji`. */
export function reactionCount(reactions: MessageReactions | undefined, emoji: string): number {
  return (reactions ?? {})[emoji]?.length ?? 0;
}

/** Whether `uid` currently has `emoji` selected. */
export function hasReacted(
  reactions: MessageReactions | undefined,
  emoji: string,
  uid: string
): boolean {
  return (reactions ?? {})[emoji]?.includes(uid) ?? false;
}

/** Toggles `uid` on `emoji` and returns a new (immutable) reactions map. */
export function toggleReaction(
  reactions: MessageReactions | undefined,
  emoji: string,
  uid: string
): MessageReactions {
  const next: MessageReactions = {};
  for (const [key, users] of Object.entries(reactions ?? {})) {
    next[key] = [...users];
  }

  const users = next[emoji] ?? [];
  const index = users.indexOf(uid);
  if (index >= 0) {
    users.splice(index, 1);
    if (users.length === 0) {
      delete next[emoji];
    }
  } else {
    users.push(uid);
    next[emoji] = users;
  }

  return next;
}

/* -------------------------------------------------------------------------- */
/*  Replies                                                                   */
/* -------------------------------------------------------------------------- */

/** Reads an untrusted value into a safe ReplyTo, or null if unusable. */
export function sanitizeReplyTo(value: unknown): ReplyTo | null {
  if (!value || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 200) return null;
  if (typeof obj.text !== 'string') return null;

  const text = obj.text.trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH) return null;

  return {
    id: obj.id,
    text,
    displayName: typeof obj.displayName === 'string' ? obj.displayName.slice(0, 100) : null,
  };
}

/** Collapses whitespace and truncates a reply preview for the composer chip. */
export function replyPreview(text: string, max = 120): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? single.slice(0, max) + '…' : single;
}

/* -------------------------------------------------------------------------- */
/*  Time / dates                                                               */
/* -------------------------------------------------------------------------- */

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

/** Formats a message timestamp as a compact relative label ("now", "5m ago"). */
export function formatTimeAgo(createdAt: Timestamp | null): string {
  if (!createdAt) return '';
  const diffMs = Date.now() - createdAt.toDate().getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatMessageDate(createdAt);
}

/** Whether two timestamps fall on the same calendar day (local). */
export function isSameDay(a: Timestamp | null, b: Timestamp | null): boolean {
  if (!a || !b) return false;
  const start = (ts: Timestamp) => {
    const d = ts.toDate();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return start(a) === start(b);
}

/** Labels a message timestamp as "Today", "Yesterday", or the full date. */
export function formatDayLabel(createdAt: Timestamp): string {
  const date = createdAt.toDate();
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' as const }),
  });
}
