# Testing

The suite runs on **Jest + React Testing Library** (CRA's built-in test runner) with 43 tests across 6 suites covering validation, hooks, and components.

## Running

| Command                                               | What it does                                    |
| ----------------------------------------------------- | ----------------------------------------------- |
| `npm test`                                            | Interactive watch mode                          |
| `npm run test:ci`                                     | Full run once, with coverage (also the CI gate) |
| `npx react-scripts test src/utils/validation.test.ts` | Run a single suite                              |

A Jest `src/setupTests.ts` provides:

- Fake `REACT_APP_FIREBASE_*` env vars so the SDK can initialize in tests (no network calls occur).
- jsdom polyfills: `TextEncoder`/`TextDecoder` (needed by some dependencies) and `Element.prototype.scrollIntoView` (not implemented by jsdom; used by the chat's auto-scroll effect).

## What is covered

| Suite                                 | Scope                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/utils/validation.test.ts`        | Message normalization/length, photo URL sanitization, time/date formatting                                     |
| `src/hooks/useMessages.test.ts`       | Live subscription mapping, error handling, sort order, pagination cursors, `loadOlder`, unsubscribe-on-unmount |
| `src/components/SignIn.test.tsx`      | Google sign-in flow, friendly error mapping, popup-closed handling                                             |
| `src/components/ChatMessage.test.tsx` | Authorship classes, avatar fallbacks, script-URL rejection, pending time element                               |
| `src/components/ChatRoom.test.tsx`    | Loading/empty states, own-message marking, load-older button, send gating, trim+send, error surface            |
| `src/App.test.tsx`                    | Auth-based routing between sign-in and chat, code-of-conduct modal flow                                        |

## Mocking strategy

Firebase modules are mocked at the module boundary — **no network, no SDK** in tests:

- `jest.mock('firebase/firestore', ...)` in the hooks test provides a fake `Timestamp`, `onSnapshot`, `getDocs`, and query builders. Callbacks are captured from `onSnapshot.mock.calls` after render, so snapshot emissions are triggered manually inside `act()`.
- Component tests mock `../firebase/messages` (`sendMessage`) and `../hooks/useMessages`, letting each test control the exact hook return value.
- `App.test.tsx` mocks `react-firebase-hooks/auth` (`useAuthState`) and the `ChatRoom` component.

## Golden rules for new tests

1. Prefer Testing Library queries (`getByRole`, `getByText`, `getByLabelText`, `getByTestId`) — never `container.querySelector` (lint-enforced).
2. Wrap asynchronous state updates in `act()` (RL fires this automatically for its own helpers; explicit `await act(async () => {})` around promise-rejecting submit flows keeps the console clean).
3. Assert user-observable behavior, not implementation details.
4. Keep jest mock factories self-contained — referencing out-of-scope variables in a `jest.mock` factory is a compile error at runtime.

## Coverage gate

`npm run test:ci` prints a coverage table. CI requires a fully green run (no test failures); coverage thresholds are informational for now.
