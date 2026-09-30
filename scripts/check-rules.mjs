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
 * This checker is a *fast* net, not a substitute for tests/firestore.rules.test.js,
 * which asserts real allow/deny behaviour against the Firestore emulator.
 *
 * Usage:
 *   node scripts/check-rules.mjs            # check the real rules file
 *   node scripts/check-rules.mjs --self-test # prove the checker detects bad rules
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = join(root, 'firestore.rules');
const validationPath = join(root, 'src', 'utils', 'validation.ts');

// Functions that exist in Realtime Database rules but NOT in Firestore rules.
const FORBIDDEN = ['all', 'exists', 'getAfter', 'hasAll', 'hasAny', 'get'];

/** Removes comments so prose about forbidden names is not read as a call site. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

/**
 * Finds Realtime-Database-only call sites.
 *
 * The match MUST also cover receiver-style calls (`list.all(...)`,
 * `map.exists(...)`) — that is precisely how the bug reached production, and an
 * earlier version of this script used a `(?<![.\w])` lookbehind that silently
 * skipped every method call, so it could never have caught it.
 *
 * The trailing `\b` keeps `allowedReactionEmojis(` from matching `all`.
 */
function findForbiddenCalls(source) {
  const code = stripComments(source);
  const pattern = new RegExp(`\\b(?:${FORBIDDEN.join('|')})\\b\\s*\\(`, 'g');
  const found = [];
  for (const match of code.matchAll(pattern)) {
    found.push({
      name: match[0].replace(/\s*\($/, ''),
      line: code.slice(0, match.index).split('\n').length,
    });
  }
  return found;
}

/** Reads a JS/TS array of single-quoted string literals and returns code points. */
function extractStringArray(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${label}. Update this script if the source moved.`);
  }
  const values = [];
  for (const literal of match[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    values.push(
      [...literal[1]].map((ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    );
  }
  return values;
}

function describeForbidden({ name, line }) {
  return (
    `firestore.rules:${line} — \`${name}()\` does not exist in Firestore Security Rules ` +
    `(it is a Realtime Database function). This evaluates to an error at request ` +
    `time and DENIES the write. Validate each value explicitly instead.`
  );
}

/* ------------------------------------------------------------------ *
 * Self-test: the checker must fail on rules that are known to be broken
 * ------------------------------------------------------------------ */
function selfTest() {
  const cases = [
    {
      name: 'receiver-style all() (the production bug)',
      code: 'function ok() { return list.all(emoji, validEmoji); }',
      expect: 1,
    },
    {
      name: 'bare all()',
      code: 'function ok() { return all(x); }',
      expect: 1,
    },
    {
      name: 'map.exists()',
      code: 'function ok() { return exists(/databases/x/y); }',
      expect: 1,
    },
    { name: 'realtime getAfter()', code: 'function ok() { return getAfter(d).v; }', expect: 1 },
    { name: 'realtime hasAll()', code: 'function ok() { return hasAll(x, y); }', expect: 1 },
    { name: 'realtime get()', code: 'function ok() { return get(d).v; }', expect: 1 },
    {
      name: 'legitimate identifier ending in "all"',
      code: 'function ok() { return allowedReactionEmojis(); }',
      expect: 0,
    },
    {
      name: 'forbidden name in a comment only',
      code: '// never use list.all() here\nfunction ok() { return true; }',
      expect: 0,
    },
    {
      name: 'forbidden name in a block comment only',
      code: '/* exists() is not available */\nfunction ok() { return true; }',
      expect: 0,
    },
  ];

  const failures = [];
  for (const { name, code, expect } of cases) {
    const found = findForbiddenCalls(code);
    if (found.length !== expect) {
      failures.push(
        `  ✖ ${name}: expected ${expect} finding(s), got ${found.length}` +
          (found.length ? ` (${found.map((f) => f.name).join(', ')})` : '')
      );
    } else {
      console.log(`  ✔ ${name}`);
    }
  }

  if (failures.length > 0) {
    console.error('\n✖ check-rules.mjs self-test failed:\n');
    for (const f of failures) console.error(f);
    console.error('');
    process.exit(1);
  }
  console.log(`\n✔ self-test passed (${cases.length} cases).`);
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

if (process.argv.includes('--self-test')) {
  selfTest();
}

const rules = readFileSync(rulesPath, 'utf8');
const validation = readFileSync(validationPath, 'utf8');

const errors = [];

/* 1. Forbidden functions */
for (const hit of findForbiddenCalls(rules)) {
  errors.push(describeForbidden(hit));
}

/* 2. Emoji allowlist drift */
let clientEmoji = null;
let rulesEmoji = null;
try {
  clientEmoji = extractStringArray(
    validation,
    /REACTION_EMOJIS\s*=\s*\[([^\]]*)\]/,
    'REACTION_EMOJIS in src/utils/validation.ts'
  );
  rulesEmoji = extractStringArray(
    rules,
    /function allowedReactionEmojis\(\)\s*\{\s*return\s*\[([^\]]*)\]/,
    'allowedReactionEmojis() in firestore.rules'
  );
} catch (error) {
  errors.push(error.message);
}

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
