import { Timestamp } from 'firebase/firestore';
import {
  formatDayLabel,
  formatMessageDate,
  formatMessageTime,
  formatTimeAgo,
  hasReacted,
  isSameDay,
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  reactionCount,
  replyPreview,
  sanitizePhotoURL,
  sanitizeReplyTo,
  toggleReaction,
  validateMessage,
} from './validation';

describe('normalizeMessageText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeMessageText('  hello world  ')).toBe('hello world');
  });

  it('keeps internal spacing intact', () => {
    expect(normalizeMessageText('hello   world')).toBe('hello   world');
  });
});

describe('validateMessage', () => {
  it('accepts a normal message', () => {
    const result = validateMessage('Hello, community!');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('Hello, community!');
  });

  it('rejects empty and whitespace-only messages', () => {
    expect(validateMessage('').valid).toBe(false);
    expect(validateMessage('   ').valid).toBe(false);
    expect(validateMessage('   ').error).toBeDefined();
  });

  it('rejects messages longer than the limit', () => {
    const tooLong = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
    const result = validateMessage(tooLong);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(String(MAX_MESSAGE_LENGTH));
  });

  it('accepts a message exactly at the limit', () => {
    expect(validateMessage('a'.repeat(MAX_MESSAGE_LENGTH)).valid).toBe(true);
  });
});

describe('sanitizePhotoURL', () => {
  it('returns null for non-strings', () => {
    expect(sanitizePhotoURL(undefined)).toBeNull();
    expect(sanitizePhotoURL(null)).toBeNull();
    expect(sanitizePhotoURL(123)).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(sanitizePhotoURL('')).toBeNull();
  });

  it('accepts valid https URLs', () => {
    expect(sanitizePhotoURL('https://placehold.co/100.png')).toBe('https://placehold.co/100.png');
  });

  it('rejects non-http protocols (e.g. javascript:)', () => {
    expect(sanitizePhotoURL(['javascript', ':', 'alert(1)'].join(''))).toBeNull();
    expect(sanitizePhotoURL('data:text/html,hi')).toBeNull();
  });

  it('returns null for URLs longer than 512 characters', () => {
    expect(sanitizePhotoURL(`https://example.com/${'a'.repeat(600)}`)).toBeNull();
  });
});

describe('formatMessageTime / formatMessageDate', () => {
  it('returns an empty string when there is no timestamp', () => {
    expect(formatMessageTime(null)).toBe('');
    expect(formatMessageDate(null)).toBe('');
  });

  it('formats a timestamp', () => {
    const timestamp = new Timestamp(1_700_000_000, 0);
    expect(formatMessageTime(timestamp)).not.toBe('');
    expect(formatMessageDate(timestamp)).not.toBe('');
  });
});

describe('formatTimeAgo', () => {
  const now = Date.now();

  it('returns an empty string when there is no timestamp', () => {
    expect(formatTimeAgo(null)).toBe('');
  });

  it('labels very recent messages as "now"', () => {
    const ts = Timestamp.fromMillis(now - 10_000);
    expect(formatTimeAgo(ts)).toBe('now');
  });

  it('labels minutes, hours and days', () => {
    expect(formatTimeAgo(Timestamp.fromMillis(now - 5 * 60_000))).toBe('5m ago');
    expect(formatTimeAgo(Timestamp.fromMillis(now - 3 * 3_600_000))).toBe('3h ago');
    expect(formatTimeAgo(Timestamp.fromMillis(now - 2 * 86_400_000))).toBe('2d ago');
  });

  it('falls back to a date for messages older than a week', () => {
    const old = Timestamp.fromMillis(now - 30 * 86_400_000);
    expect(formatTimeAgo(old)).toBe(formatMessageDate(old));
  });
});

describe('isSameDay', () => {
  it('detects messages that share a calendar day', () => {
    const morning = Timestamp.fromMillis(new Date(2026, 0, 5, 8, 0, 0).getTime());
    const evening = Timestamp.fromMillis(new Date(2026, 0, 5, 22, 30, 0).getTime());
    const nextDay = Timestamp.fromMillis(new Date(2026, 0, 6, 1, 0, 0).getTime());

    expect(isSameDay(morning, evening)).toBe(true);
    expect(isSameDay(morning, nextDay)).toBe(false);
    expect(isSameDay(morning, null)).toBe(false);
  });
});

describe('formatDayLabel', () => {
  it('labels today and yesterday', () => {
    expect(formatDayLabel(Timestamp.fromDate(new Date()))).toBe('Today');
    expect(formatDayLabel(Timestamp.fromMillis(Date.now() - 86_400_000))).toBe('Yesterday');
  });

  it('labels older messages with a full date', () => {
    const label = formatDayLabel(Timestamp.fromMillis(Date.now() - 5 * 86_400_000));
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('reactions', () => {
  it('counts reactors and detects the current user', () => {
    const reactions = { '👍': ['u1', 'u2'] };
    expect(reactionCount(reactions, '👍')).toBe(2);
    expect(hasReacted(reactions, '👍', 'u1')).toBe(true);
    expect(hasReacted(reactions, '👍', 'u3')).toBe(false);
    expect(reactionCount(undefined, '👍')).toBe(0);
    expect(hasReacted(undefined, '👍', 'u1')).toBe(false);
  });

  it('adds a reaction without mutating the previous map', () => {
    const before = { '👍': ['u1'] };
    const after = toggleReaction(before, '🔥', 'u2');

    expect(after).toEqual({ '👍': ['u1'], '🔥': ['u2'] });
    expect(before).toEqual({ '👍': ['u1'] });
  });

  it('removes a reaction and drops the key when it reaches zero', () => {
    const after = toggleReaction({ '👍': ['u1'] }, '👍', 'u1');
    expect(after).toEqual({});
  });

  it('toggles an existing reaction off without touching the others', () => {
    const after = toggleReaction({ '👍': ['u1'], '😂': ['u2'] }, '👍', 'u1');
    expect(after).toEqual({ '😂': ['u2'] });
  });
});

describe('sanitizeReplyTo', () => {
  it('accepts a well-formed quote', () => {
    const reply = sanitizeReplyTo({ id: 'm1', text: 'Hello there', displayName: 'Redwan' });
    expect(reply).toEqual({ id: 'm1', text: 'Hello there', displayName: 'Redwan' });
  });

  it('allows a null display name and trims the text', () => {
    expect(sanitizeReplyTo({ id: 'm1', text: '  hi  ', displayName: null })).toEqual({
      id: 'm1',
      text: 'hi',
      displayName: null,
    });
  });

  it('rejects malformed, empty and oversized quotes', () => {
    expect(sanitizeReplyTo(null)).toBeNull();
    expect(sanitizeReplyTo('nope')).toBeNull();
    expect(sanitizeReplyTo({ id: '', text: 'x' })).toBeNull();
    expect(sanitizeReplyTo({ id: 'm1', text: '   ' })).toBeNull();
    expect(sanitizeReplyTo({ text: 'x' })).toBeNull();
    expect(sanitizeReplyTo({ id: 'm1', text: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) })).toBeNull();
  });

  it('caps an overlong display name', () => {
    const reply = sanitizeReplyTo({ id: 'm1', text: 'hi', displayName: 'x'.repeat(300) });
    expect(reply?.displayName).toHaveLength(100);
  });
});

describe('replyPreview', () => {
  it('collapses whitespace', () => {
    expect(replyPreview('  a\n\n  b  ')).toBe('a b');
  });

  it('truncates long text with an ellipsis', () => {
    expect(replyPreview('a'.repeat(200), 10)).toBe('a'.repeat(10) + '…');
  });
});
