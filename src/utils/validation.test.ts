import { Timestamp } from 'firebase/firestore';
import {
  formatMessageDate,
  formatMessageTime,
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  sanitizePhotoURL,
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
