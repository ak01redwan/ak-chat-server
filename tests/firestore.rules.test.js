/**
 * Firestore security rules tests.
 *
 * These run against the Firestore emulator (see `npm run test:rules`), which is
 * the only way to assert what the rules actually *do* at request time. That
 * matters here: an unsupported function such as `list.all()` is only a
 * *warning* at compile time, compiles "successfully", and then denies every
 * write at runtime. A static check cannot catch that; these tests can.
 *
 * Keep the emoji allowlist assertions in sync with REACTION_EMOJIS in
 * src/utils/validation.ts (scripts/check-rules.mjs enforces the rules side).
 */
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} = require('firebase/firestore');

const RULES = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8');

const PROJECT_ID = 'ak-chat-server-rules-test';
const AUTHOR = 'user-author';
const OTHER = 'user-other';

// Mirrors REACTION_EMOJIS: thumbs up, heart, joy, party popper, fire.
const EMOJI = {
  thumbsUp: '\u{1F44D}',
  heart: '\u{2764}\u{FE0F}',
  joy: '\u{1F602}',
  party: '\u{1F389}',
  fire: '\u{1F525}',
};
const NON_ALLOWLISTED = '\u{1F937}';

let env;

/** A valid message payload for `uid`, using the server timestamp. */
function message(uid, overrides = {}) {
  return {
    text: 'Hello community',
    uid,
    displayName: 'Redwan',
    photoURL: 'https://example.com/a.png',
    createdAt: serverTimestamp(),
    replyTo: null,
    reactions: {},
    ...overrides,
  };
}

function db(uid) {
  return env.authenticatedContext(uid).firestore();
}
function anonDb() {
  return env.unauthenticatedContext().firestore();
}

/** Writes directly, bypassing the rules, to set up fixtures. */
function seed(fn) {
  return env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

function msgRef(id) {
  return doc(db(AUTHOR), 'messages', id);
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES },
  });
});

afterAll(async () => {
  await env.cleanup();
});

afterEach(async () => {
  await env.clearFirestore();
});

/* ================================================================== *
 * messages — reads
 * ================================================================== */
describe('messages: reads', () => {
  it('denies reading the chat log when signed out', async () => {
    await seed((firestore) => setDoc(doc(firestore, 'messages', 'm1'), message(AUTHOR)));

    await assertFails(getDocs(collection(anonDb(), 'messages')));
  });

  it('allows a signed-in user to read the chat log', async () => {
    await seed((firestore) => setDoc(doc(firestore, 'messages', 'm1'), message(AUTHOR)));

    await assertSucceeds(getDocs(collection(db(OTHER), 'messages')));
  });
});

/* ================================================================== *
 * messages — create
 * ================================================================== */
describe('messages: create', () => {
  it('denies creating a message when signed out', async () => {
    await assertFails(setDoc(doc(anonDb(), 'messages', 'm1'), message(AUTHOR)));
  });

  it('allows a valid self-authored message', async () => {
    await assertSucceeds(setDoc(msgRef('m1'), message(AUTHOR)));
  });

  it('denies forging another uid', async () => {
    await assertFails(setDoc(msgRef('m1'), message(OTHER)));
  });

  it('denies a client-controlled createdAt', async () => {
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { createdAt: new Date() })));
  });

  it('denies an unexpected field', async () => {
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { isAdmin: true })));
  });

  it('denies empty text', async () => {
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { text: '' })));
  });

  it('denies text longer than 1000 characters', async () => {
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { text: 'a'.repeat(1001) })));
  });

  it('allows a message with a quote preview', async () => {
    await assertSucceeds(
      setDoc(
        msgRef('m1'),
        message(AUTHOR, {
          replyTo: { id: 'm0', text: 'original', displayName: 'Redwan' },
        })
      )
    );
  });

  it('denies a reply preview carrying extra fields', async () => {
    await assertFails(
      setDoc(
        msgRef('m1'),
        message(AUTHOR, {
          replyTo: { id: 'm0', text: 'original', displayName: 'Redwan', uid: 'spoofed' },
        })
      )
    );
  });

  it('denies a non-http photoURL', async () => {
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { photoURL: 'javascript:alert(1)' })));
  });

  it('denies a plaintext http photoURL', async () => {
    await assertFails(
      setDoc(msgRef('m1'), message(AUTHOR, { photoURL: 'http://placehold.co/100.png' }))
    );
  });

  it('denies a photoURL longer than 512 characters', async () => {
    await assertFails(
      setDoc(msgRef('m1'), message(AUTHOR, { photoURL: `https://e.co/${'a'.repeat(520)}` }))
    );
  });
});

/* ================================================================== *
 * messages — reactions
 *
 * Regression tests for the `list.all()` bug: that call is a
 * Realtime-Database-only function. It compiled with a warning and then
 * denied every create at runtime.
 * ================================================================== */
describe('messages: reactions', () => {
  it('allows a create carrying allowlisted reactions', async () => {
    await assertSucceeds(
      setDoc(
        msgRef('m1'),
        message(AUTHOR, { reactions: { [EMOJI.thumbsUp]: [OTHER], [EMOJI.party]: [AUTHOR] } })
      )
    );
  });

  it('denies a reaction key outside the allowlist', async () => {
    await assertFails(
      setDoc(msgRef('m1'), message(AUTHOR, { reactions: { [NON_ALLOWLISTED]: [OTHER] } }))
    );
  });

  it('allows every emoji the client offers', async () => {
    const all = Object.values(EMOJI).reduce((acc, e) => ({ ...acc, [e]: [OTHER] }), {});
    await assertSucceeds(setDoc(msgRef('m1'), message(AUTHOR, { reactions: all })));
  });

  it('denies a reaction value that is not a list', async () => {
    await assertFails(
      setDoc(msgRef('m1'), message(AUTHOR, { reactions: { [EMOJI.fire]: 'nope' } }))
    );
  });

  it('denies more than 50 reactors on one emoji', async () => {
    const uids = Array.from({ length: 51 }, (_, i) => `u${i}`);
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { reactions: { [EMOJI.fire]: uids } })));
  });

  it('denies more than 5 distinct emoji keys', async () => {
    const many = Object.values(EMOJI)
      .concat([NON_ALLOWLISTED])
      .reduce((acc, e) => ({ ...acc, [e]: [OTHER] }), {});
    await assertFails(setDoc(msgRef('m1'), message(AUTHOR, { reactions: many })));
  });
});

/* ================================================================== *
 * messages — update / delete
 * ================================================================== */
describe('messages: update', () => {
  beforeEach(async () => {
    await seed((firestore) =>
      setDoc(doc(firestore, 'messages', 'm1'), {
        text: 'Hello community',
        uid: AUTHOR,
        displayName: 'Redwan',
        photoURL: 'https://example.com/a.png',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        replyTo: null,
        reactions: {},
      })
    );
  });

  it('allows the author to edit their own text', async () => {
    await assertSucceeds(updateDoc(msgRef('m1'), { text: 'Edited' }));
  });

  it('denies editing someone else’s message', async () => {
    await assertFails(updateDoc(doc(db(OTHER), 'messages', 'm1'), { text: 'Hacked' }));
  });

  it('denies editing when signed out', async () => {
    await assertFails(updateDoc(doc(anonDb(), 'messages', 'm1'), { text: 'Nope' }));
  });

  it('denies changing content and reactions in one update', async () => {
    await assertFails(
      updateDoc(msgRef('m1'), { text: 'Edited', reactions: { [EMOJI.fire]: [OTHER] } })
    );
  });

  it('denies the author changing their own displayName', async () => {
    await assertFails(updateDoc(msgRef('m1'), { displayName: 'Moderator' }));
  });

  it('denies the author changing their own photoURL', async () => {
    await assertFails(updateDoc(msgRef('m1'), { photoURL: 'https://example.com/president.png' }));
  });

  it('denies impersonation by editing text and displayName together', async () => {
    await assertFails(updateDoc(msgRef('m1'), { text: 'Trust me', displayName: 'Moderator' }));
  });

  it('allows any signed-in user to toggle reactions', async () => {
    await assertSucceeds(
      updateDoc(doc(db(OTHER), 'messages', 'm1'), { reactions: { [EMOJI.fire]: [OTHER] } })
    );
  });

  it('denies a reaction update carrying a non-allowlisted key', async () => {
    await assertFails(
      updateDoc(doc(db(OTHER), 'messages', 'm1'), { reactions: { [NON_ALLOWLISTED]: [OTHER] } })
    );
  });

  it('denies clearing the createdAt timestamp', async () => {
    await assertFails(updateDoc(msgRef('m1'), { createdAt: new Date() }));
  });
});

/* ================================================================== *
 * Realistic client round-trip
 *
 * Reproduces, byte for byte, the payloads src/firebase/messages.ts writes.
 * The user reported being unable to reply to other people's messages, so the
 * only trustworthy way to rule the rules out is to replay the real sequence:
 * author posts, a DIFFERENT user replies, then reacts, edits and deletes.
 * ================================================================== */
describe('client round-trip: replying to another user', () => {
  // A realistic Google avatar URL, which is long and query-heavy.
  const GOOGLE_AVATAR =
    'https://lh3.googleusercontent.com/a/ACg8ocSyHfzHhAo4mM3VhZbYtLZSdL1kF3sPz9xQ7vN2mR8wT5yJ0cE1uI6oP4aS9dF7gH2jK5lM8nB3vX6zQ0=/s96-c';

  beforeEach(async () => {
    await seed((firestore) =>
      setDoc(doc(firestore, 'messages', 'm1'), {
        text: 'Hello community, welcome!',
        uid: AUTHOR,
        displayName: 'Redwan',
        photoURL: GOOGLE_AVATAR,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        replyTo: null,
        reactions: {},
      })
    );
  });

  it('lets another user reply to a message they did not write', async () => {
    // Exactly what sendMessage() builds when replyTo is set.
    const replyTo = {
      id: 'm1',
      text: 'Hello community, welcome!',
      displayName: 'Redwan',
    };

    await assertSucceeds(
      addDoc(collection(db(OTHER), 'messages'), {
        text: 'Thanks for the warm welcome!',
        uid: OTHER,
        displayName: 'Guest',
        photoURL: GOOGLE_AVATAR,
        createdAt: serverTimestamp(),
        replyTo,
        reactions: {},
      })
    );
  });

  it('lets another user reply when the quoted author has no display name', async () => {
    await assertSucceeds(
      addDoc(collection(db(OTHER), 'messages'), {
        text: 'Replying to an anonymous message',
        uid: OTHER,
        displayName: null,
        photoURL: null,
        createdAt: serverTimestamp(),
        replyTo: { id: 'm1', text: 'Hello community, welcome!', displayName: null },
        reactions: {},
      })
    );
  });

  it('lets another user reply to a message that is itself a reply', async () => {
    await seed((firestore) =>
      setDoc(doc(firestore, 'messages', 'm2'), {
        text: 'First reply',
        uid: OTHER,
        displayName: 'Guest',
        photoURL: null,
        createdAt: new Date('2026-01-01T00:05:00Z'),
        replyTo: { id: 'm1', text: 'Hello community, welcome!', displayName: 'Redwan' },
        reactions: {},
      })
    );

    await assertSucceeds(
      addDoc(collection(db(AUTHOR), 'messages'), {
        text: 'Replying to the reply',
        uid: AUTHOR,
        displayName: 'Redwan',
        photoURL: null,
        createdAt: serverTimestamp(),
        replyTo: { id: 'm2', text: 'First reply', displayName: 'Guest' },
        reactions: {},
      })
    );
  });

  it('lets another user react, and the author then edit their own text', async () => {
    await assertSucceeds(
      updateDoc(doc(db(OTHER), 'messages', 'm1'), {
        reactions: { [EMOJI.heart]: [OTHER], [EMOJI.thumbsUp]: [OTHER, AUTHOR] },
      })
    );
    await assertSucceeds(updateDoc(msgRef('m1'), { text: 'Hello community, welcome all!' }));
  });

  it('accepts a maximal-length quoted message', async () => {
    await assertSucceeds(
      addDoc(collection(db(OTHER), 'messages'), {
        text: 'ok',
        uid: OTHER,
        displayName: 'Guest',
        photoURL: null,
        createdAt: serverTimestamp(),
        replyTo: { id: 'm1', text: 'a'.repeat(1000), displayName: 'Redwan' },
        reactions: {},
      })
    );
  });

  it('accepts a realistic Google avatar on a new message', async () => {
    await assertSucceeds(
      addDoc(collection(db(OTHER), 'messages'), {
        text: 'Avatar check',
        uid: OTHER,
        displayName: 'Guest',
        photoURL: GOOGLE_AVATAR,
        createdAt: serverTimestamp(),
        replyTo: null,
        reactions: {},
      })
    );
    expect(GOOGLE_AVATAR.length).toBeLessThanOrEqual(512);
  });
});

describe('messages: delete', () => {
  beforeEach(async () => {
    await seed((firestore) =>
      setDoc(doc(firestore, 'messages', 'm1'), {
        text: 'Hello community',
        uid: AUTHOR,
        displayName: 'Redwan',
        photoURL: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        replyTo: null,
        reactions: {},
      })
    );
  });

  it('allows the author to delete their own message', async () => {
    await assertSucceeds(deleteDoc(msgRef('m1')));
  });

  it('denies deleting someone else’s message', async () => {
    await assertFails(deleteDoc(doc(db(OTHER), 'messages', 'm1')));
  });

  it('denies deleting when signed out', async () => {
    await assertFails(deleteDoc(doc(anonDb(), 'messages', 'm1')));
  });
});

/* ================================================================== *
 * presence
 * ================================================================== */
describe('presence', () => {
  function presence(uid, overrides = {}) {
    return {
      uid,
      displayName: 'Redwan',
      photoURL: '',
      online: true,
      lastSeen: serverTimestamp(),
      ...overrides,
    };
  }

  it('denies reading the roster when signed out', async () => {
    await assertFails(getDocs(collection(anonDb(), 'presence')));
  });

  it('allows a signed-in user to read the roster', async () => {
    await assertSucceeds(getDocs(collection(db(OTHER), 'presence')));
  });

  it('allows publishing your own presence', async () => {
    await assertSucceeds(setDoc(doc(db(AUTHOR), 'presence', AUTHOR), presence(AUTHOR)));
  });

  it('denies writing someone else’s presence', async () => {
    // OTHER is signed in but targets AUTHOR's row.
    await assertFails(setDoc(doc(db(OTHER), 'presence', AUTHOR), presence(OTHER)));
  });

  it('denies publishing your own presence under another uid', async () => {
    await assertFails(setDoc(doc(db(AUTHOR), 'presence', OTHER), presence(AUTHOR)));
  });

  it('denies a client-controlled lastSeen', async () => {
    await assertFails(
      setDoc(doc(db(AUTHOR), 'presence', AUTHOR), presence(AUTHOR, { lastSeen: new Date() }))
    );
  });

  it('denies an unexpected presence field', async () => {
    await assertFails(
      setDoc(doc(db(AUTHOR), 'presence', AUTHOR), presence(AUTHOR, { device: 'phone' }))
    );
  });

  it('allows marking yourself offline', async () => {
    await assertSucceeds(
      setDoc(
        doc(db(AUTHOR), 'presence', AUTHOR),
        presence(AUTHOR, { online: false, lastSeen: serverTimestamp() })
      )
    );
  });

  it('allows deleting your own presence row', async () => {
    await assertSucceeds(deleteDoc(doc(db(AUTHOR), 'presence', AUTHOR)));
  });

  it('denies deleting someone else’s presence row', async () => {
    await assertFails(deleteDoc(doc(db(OTHER), 'presence', AUTHOR)));
  });
});

/* ================================================================== *
 * client-contract guard
 * ================================================================== */
describe('client contract', () => {
  it('reads back the fields the app depends on', async () => {
    const ref = doc(db(AUTHOR), 'messages', 'm1');
    await seed((firestore) =>
      setDoc(doc(firestore, 'messages', 'm1'), {
        text: 'Hello community',
        uid: AUTHOR,
        displayName: 'Redwan',
        photoURL: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        replyTo: { id: 'm0', text: 'original', displayName: 'Redwan' },
        reactions: { [EMOJI.party]: [OTHER] },
      })
    );

    const snap = await assertSucceeds(getDoc(ref));
    expect(snap.exists()).toBe(true);
    expect(snap.data().replyTo.id).toBe('m0');
    expect(snap.data().reactions[EMOJI.party]).toEqual([OTHER]);
    expect(typeof snap.data().createdAt.toMillis()).toBe('number');
  });
});
