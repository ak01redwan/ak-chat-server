# Testing

There are two separate suites, because they catch different classes of bug:

| Suite                        | Tests | Runner                       | Needs a JDK? |
| ---------------------------- | ----- | ---------------------------- | ------------ |
| App (validation, hooks, UI)  | 98    | Jest + React Testing Library | no           |
| `firestore.rules` (security) | 44    | Jest + Firestore emulator    | **yes**      |

The rules suite exists because a Firestore rules file can **compile successfully and still deny
every write at runtime**. That is not hypothetical — it happened here, and the emulator suite is
what proves the rules actually behave.

## Running

| Command                                               | What it does                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm test`                                            | Interactive watch mode                                                         |
| `npm run test:ci`                                     | Full app run once, with coverage (the app CI gate)                             |
| `npm run test:rules`                                  | Firestore rules tests against the emulator (the rules CI gate)                 |
| `npm run build && npm run verify:build`               | Build, then smoke-check the output                                             |
| `npm run verify:rules`                                | Static scan of `firestore.rules` (forbidden functions + emoji allowlist drift) |
| `npm run verify:rules:self-test`                      | Proves the static scan fails on known-bad rules (9 fixtures)                   |
| `npm run verify`                                      | Everything above in one pass                                                   |
| `npx react-scripts test src/utils/validation.test.ts` | Run a single app suite                                                         |

> `npm run verify` and `npm run test:rules` need a **JDK 21** (`winget install
EclipseAdoptium.Temurin.21.JDK`, or `brew install openjdk@21`) because the Firestore emulator
> runs on the JVM. The app suite, lint, typecheck and build have no such requirement. CI installs
> the JDK explicitly with `actions/setup-java`.

A Jest `src/setupTests.ts` provides:

- Fake `REACT_APP_FIREBASE_*` env vars so the SDK can initialize in tests (no network calls occur).
- jsdom polyfills:
  - `TextEncoder`/`TextDecoder` (needed by some dependencies)
  - `Element.prototype.scrollIntoView` (not implemented by jsdom; used by the chat's auto-scroll effect)
  - `window.matchMedia` (used by the theme provider to follow `prefers-color-scheme`)
  - `navigator.clipboard.writeText` (used by "copy message")

> The `matchMedia` and `clipboard` stubs are defined with `configurable: true`. Without that,
> `userEvent.setup()` throws `Cannot redefine property: clipboard`, because user-event installs its
> own clipboard stub on every `setup()` call.

## What is covered

| Suite                                       | Scope                                                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/validation.test.ts`              | Message normalization/length, photo URL sanitization, reply sanitization, reaction helpers, time/date formatting                               |
| `src/hooks/useMessages.test.ts`             | Live subscription mapping, error handling, sort order, pagination cursors, `loadOlder`, unsubscribe-on-unmount                                 |
| `src/components/SignIn.test.tsx`            | Google sign-in flow, friendly error mapping, popup-closed handling                                                                             |
| `src/components/ChatMessage.test.tsx`       | Authorship classes, avatar fallbacks, script-URL rejection, pending time element, reactions, inline edit, copy/reply/delete action wiring      |
| `src/components/ChatRoom.test.tsx`          | Loading/empty states, own-message marking, load-older, send gating, trim+send, errors, quick emoji, replies, search, reactions, delete confirm |
| `src/components/ThemeToggle.test.tsx`       | Light/dark switching and persistence to `localStorage`                                                                                         |
| `src/components/ConfirmationModal.test.tsx` | Confirm/cancel via button, overlay click, and Escape                                                                                           |
| `src/App.test.tsx`                          | Auth-based routing, code-of-conduct modal flow, theme wiring, online-count, skip link, auth errors                                             |

## Mocking strategy

Firebase modules are mocked at the module boundary — **no network, no SDK** in tests:

- `jest.mock('firebase/firestore', ...)` in the hooks test provides a fake `Timestamp`, `onSnapshot`, `getDocs`, and query builders. Callbacks are captured from `onSnapshot.mock.calls` after render, so snapshot emissions are triggered manually inside `act()`.
- Component tests mock `../firebase/messages` (`sendMessage`, `editMessage`, `deleteMessage`, `setMessageReactions`) and `../hooks/useMessages`, letting each test control the exact hook return value.
- `App.test.tsx` mocks `react-firebase-hooks/auth` (`useAuthState`), the `ChatRoom` component, and `../hooks/usePresence`.

> **CRA sets `resetMocks: true`**, so every mock's _implementation_ is wiped before each test. A mock
> defined as `jest.fn(() => value)` at module level therefore returns `undefined` inside a test. Set
> the return value in `beforeEach` instead:
>
> ```ts
> const mockedUsePresence = usePresence as jest.Mock;
> beforeEach(() => {
>   mockedUsePresence.mockReturnValue({
>     onlineCount: 2,
>     onlineUserIds: ['a', 'b'],
>     ready: true,
>     error: null,
>   });
> });
> ```

## Golden rules for new tests

1. Prefer Testing Library queries (`getByRole`, `getByText`, `getByLabelText`, `getByTestId`) — never `container.querySelector` (lint-enforced).
2. Query accessible names **exactly**. Labels are often suffixed (e.g. `Edit your message from Redwan`), so use a regex (`{ name: /edit your message/i }`) when a name carries dynamic data.
3. Assert at the level the behaviour lives: a component test should assert the callback it was given, not an unrelated side effect. (Clipboard writes happen in `ChatRoom`, not in `ChatMessage`.)
4. Wrap asynchronous state updates in `act()` (RL fires this automatically for its own helpers; explicit `await act(async () => {})` around promise-rejecting submit flows keeps the console clean).
5. Assert user-observable behavior, not implementation details.
6. Keep jest mock factories self-contained — referencing out-of-scope variables in a `jest.mock` factory is a compile error at runtime.

## Firestore rules tests

`tests/firestore.rules.test.js` runs **44 allow/deny assertions against the Firestore emulator** via
`@firebase/rules-unit-testing`. `firebase emulators:exec` boots the emulator, injects
`FIRESTORE_EMULATOR_HOST`, and tears it down afterwards, so there is no manual server to manage.

| Area          | Asserted                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messages`    | reads denied when signed out; valid self-authored create allowed; forged `uid`, client `createdAt`, extra fields, empty/over-long text, non-https and over-long `photoURL` all denied |
| reply preview | `replyTo` with the 3 allowed keys allowed; extra keys (e.g. a spoofed `uid`) denied                                                                                                   |
| reactions     | allowlisted emoji allowed; **non-allowlisted key denied**; every emoji the client offers allowed; non-list value, >50 reactors, >5 keys denied                                        |
| edit          | author may change `text`; editing another user's message, or signed-out, denied; changing `displayName`/`photoURL` denied (impersonation); content+reactions in one write denied      |
| delete        | author allowed; other user and signed-out denied                                                                                                                                      |
| `presence`    | roster denied when signed out; own row allowed; another user's row, wrong-uid path, client `lastSeen`, extra field denied                                                             |

Fixtures are written with `withSecurityRulesDisabled` so setup bypasses the rules, then asserted
through authenticated/unauthenticated contexts.

### Why these tests are not optional

Two bugs shipped from this file, and **neither was found by reading the rules**:

1. `list.all(...)` — a Realtime-Database-only function inside the reactions validator. The compiler
   warned, then reported `compiled successfully`, and production denied every message create.
2. `canEditOwnMessage()` omitted `displayName`/`photoURL` from its immutability checks, so an author
   could rename themselves to "Moderator" on an old message.

To confirm the suite still has teeth, the `list.all(...)` bug was temporarily reintroduced: the
static scan failed with exit code 1 and **6 of the rules tests failed**, including _allows a create
carrying allowlisted reactions_. The bug was then reverted. A test suite that cannot fail on the
original defect is not a safety net.

## Static rules checks

`npm run verify:rules` is a fast static scan over `firestore.rules` that catches:

1. **Forbidden higher-order functions.** Firestore Security Rules have no `all()` / `exists()` /
   `getAfter()` / `get()` / `hasAll()` / `hasAny()` (those are Realtime Database functions). The
   compiler reports them only as _warnings_ and still says "compiled successfully", but at request
   time the expression errors and the write is **denied**. The pattern matches receiver-style calls
   (`list.all(...)`) as well as bare calls, which is the shape that caused the outage.
2. **Reaction allowlist drift.** The rules validate reaction keys against a literal allowlist.
   An off-by-one surrogate pair looks like a valid emoji but never matches, so reactions fail
   with `PERMISSION_DENIED`.

`npm run verify:rules:self-test` runs 9 fixtures through that scanner — the real
`list.all(...)` shape, bare calls, each Realtime-only function, a legitimate identifier that merely
ends in `all` (`allowedReactionEmojis(`), and forbidden names appearing only in comments. It
guards against the scanner silently regressing into something that can never fail.

`node scripts/sync-reaction-emoji.mjs` rewrites the rules allowlist from
`REACTION_EMOJIS` in the client, which is the safe way to change the reaction set.

## Coverage gate

`npm run test:ci` prints a coverage table. CI requires a fully green run (no test failures); coverage thresholds are informational for now.
