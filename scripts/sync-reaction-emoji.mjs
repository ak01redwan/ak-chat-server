/**
 * One-off helper: rewrite the reaction allowlist inside firestore.rules using
 * the exact characters from REACTION_EMOJIS in src/utils/validation.ts, so the
 * two can never drift by a surrogate pair.
 *
 * Usage: node scripts/sync-reaction-emoji.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = join(root, 'firestore.rules');
const validationPath = join(root, 'src', 'utils', 'validation.ts');

const validation = readFileSync(validationPath, 'utf8');
let rules = readFileSync(rulesPath, 'utf8');

const match = validation.match(/REACTION_EMOJIS\s*=\s*\[([^\]]*)\]/);
if (!match) throw new Error('Could not find REACTION_EMOJIS in src/utils/validation.ts');

const emoji = [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
if (emoji.length === 0) throw new Error('REACTION_EMOJIS is empty');

const list = emoji.map((e) => `'${e}'`).join(', ');

// The allowlist return value.
rules = rules.replace(
  /(function allowedReactionEmojis\(\)\s*\{\s*return\s*)\[[^\]]*\]/,
  `$1[${list}]`
);

// The individual validReactionEntry calls, in the same order.
let cursor = 0;
rules = rules.replace(/validReactionEntry\(reactions, '[^']*'\)/g, () => {
  const replacement = `validReactionEntry(reactions, '${emoji[cursor]}')`;
  cursor += 1;
  return replacement;
});

if (cursor !== emoji.length) {
  throw new Error(`Expected ${emoji.length} validReactionEntry calls, patched ${cursor}`);
}

writeFileSync(rulesPath, rules, 'utf8');
console.log(`✔ Synced ${emoji.length} reaction emoji into firestore.rules:`);
for (const e of emoji) {
  console.log(`   U+${[...e].map((c) => c.codePointAt(0).toString(16).toUpperCase()).join('+')}`);
}
