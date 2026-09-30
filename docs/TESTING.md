# Testing

The suite runs on **Jest + React Testing Library** (CRA's built-in test runner) with 97 tests across 8 suites covering validation, hooks, and components.

## Running

| Command                                               | What it does                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm test`                                            | Interactive watch mode                                                         |
| `npm run test:ci`                                     | Full run once, with coverage (also the CI gate)                                |
| `npm run build && npm run verify:build`               | Build, then smoke-check the output                                             |
| `npm run verify:rules`                                | Static check for Firestore rules (forbidden functions + emoji allowlist drift) |
| `npm run verify`                                      | Runs lint, typecheck, rules check, tests, build and verify:build in one pass   |
| `npx react-scripts test src/utils/validation.test.ts` | Run a single suite                                                             |

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

## Firestore rules checks

`npm run verify:rules` is a static check over `firestore.rules` that catches two failure
modes which are otherwise invisible until production:

1. **Forbidden higher-order functions.** Firestore Security Rules have no `all()` / `exists()`
   (those are Realtime Database functions). The rules compiler reports them only as
   _warnings_ and still says "compiled successfully", but at request time the expression
   errors and the write is **denied**. This project shipped exactly that bug: `list.all(...)`
   inside the reactions validator made every message create fail.
2. **Reaction allowlist drift.** The rules validate reaction keys against a literal allowlist.
   An off-by-one surrogate pair looks like a valid emoji but never matches, so reactions fail
   with `PERMISSION_DENIED`.

`node scripts/sync-reaction-emoji.mjs` rewrites the rules allowlist from
`REACTION_EMOJIS` in the client, which is the safe way to change the reaction set.

> Automated rules **execution** tests (via `@firebase/rules-unit-testing` + the Firestore
> emulator) are not wired up yet: the emulator requires a JDK. Tracked in
> [ROADMAP.md](ROADMAP.md).

## Coverage gate

`npm run test:ci` prints a coverage table. CI requires a fully green run (no test failures); coverage thresholds are informational for now.
