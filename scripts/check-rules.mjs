#!/usr/bin/env node
/**
 * Static checks for firestore.rules that catch the two failure modes that are
 * easy to introduce and hard to notice:
 *
 * 1. Forbidden higher-order functions. Firestore Security Rules have NO
 *    `all()` / `exists()` — those belong to Realtime Database. The rules
 *    compiler only reports them as *warnings*, and the file still "compiles
 *    successfully", so a bad rule can reach production and silently evaluate
 *    to an error at request time (which denies the write). This project hit
 *    exactly that: `list.all(...)` made every message create fail.
 *
 * 2. Emoji allowlist drift. The rules validate reaction keys against a literal
 *    allowlist. If it drifts from REACTION_EMOJIS in the client, reactions are
 *    rejected with PERMISSION_DENIED. Invisible to the eye: an off-by-one
 *    surrogate pair is still a plausible-looking emoji.
 *
 * Usage: node scripts/check-rules.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = join(root, 'firestore.rules');
const validationPath = join(root, 'src', 'utils', 'validation.ts');

const rules = readFileSync(rulesPath, 'utf8');
const validation = readFileSync(validationPath, 'utf8');

const errors = [];

/* ------------------------------------------------------------------ *
 * 1. Forbidden functions
 * ------------------------------------------------------------------ */

// Functions that exist in Realtime Database rules but NOT in Firestore rules.
const FORBIDDEN = ['all', 'exists'];

// Strip comments so the explanatory notes in the rules file (which mention the
// forbidden names on purpose) are not mistaken for real call sites.
const rulesCode = rules
  .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, '');

// Match a call site: an identifier followed by '(' , excluding method calls on
// a receiver (`.name(`).
const callPattern = new RegExp(`(?<![.\\w])(${FORBIDDEN.join('|')})\\s*\\(`, 'g');

for (const match of rulesCode.matchAll(callPattern)) {
  const [, name] = match;
  const line = rulesCode.slice(0, match.index).split('\n').length;
  errors.push(
    `firestore.rules:${line} — \`${name}()\` does not exist in Firestore Security Rules ` +
      `(it is a Realtime Database function). This evaluates to an error at request ` +
      `time and DENIES the write. Validate each value explicitly instead.`
  );
}

/* ------------------------------------------------------------------ *
 * 2. Emoji allowlist drift
 * ------------------------------------------------------------------ */

/** Reads a JS/TS array of single-quoted string literals and returns code points. */
function extractStringArray(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    errors.push(`Could not find ${label}. Update this script if the source moved.`);
    return null;
  }
  const values = [];
  for (const literal of match[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    values.push(
      [...literal[1]].map((ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    );
  }
  return values;
}

const clientEmoji = extractStringArray(
  validation,
  /REACTION_EMOJIS\s*=\s*\[([^\]]*)\]/,
  'REACTION_EMOJIS in src/utils/validation.ts'
);
const rulesEmoji = extractStringArray(
  rules,
  /function allowedReactionEmojis\(\)\s*\{\s*return\s*\[([^\]]*)\]/,
  'allowedReactionEmojis() in firestore.rules'
);

if (clientEmoji && rulesEmoji) {
  if (clientEmoji.length !== rulesEmoji.length) {
    errors.push(
      `Reaction allowlists differ in length: client has ${clientEmoji.length}, ` +
        `rules have ${rulesEmoji.length}. Update allowedReactionEmojis() in firestore.rules.`
    );
  } else {
    clientEmoji.forEach((client, i) => {
      const rule = rulesEmoji[i];
      if (client.join('+') !== rule.join('+')) {
        errors.push(
          `Reaction allowlist drift at index ${i}: ` +
            `client is U+${client.join('+')} but firestore.rules has U+${rule.join('+')}. ` +
            `Reactions for that emoji will fail with PERMISSION_DENIED.`
        );
      }
    });
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

if (errors.length > 0) {
  console.error('✖ firestore.rules check failed:\n');
  for (const error of errors) console.error(`  • ${error}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✔ firestore.rules check passed: no forbidden functions, ` +
    `reaction allowlist matches the client (${clientEmoji?.length ?? 0} emoji).`
);
