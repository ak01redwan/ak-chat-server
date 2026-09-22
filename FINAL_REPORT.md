# AK-CHAT Development Report — v1.0.0

**Date:** 2026-09-22
**Branch:** `main`
**Status:** Build ready; deploy requires one-time secrets + rules deploy (see below)

---

## Executive summary

AK-CHAT was rebuilt from a broken, unstyled single-file proof of concept into a professional,
typed, tested, and CI-gated React application. The live site failure was root-caused and fixed,
Firestore is now secured by rules, the UI was redesigned around a modern dark theme, real-time
messaging gained pagination, and a 43-test suite protects the whole app. Deploying is now a
routine `push to main` — pending two one-time setup steps owned by the repo owner.

---

## Root cause of the broken live site

The production site died because commit `3bb5a8b` replaced the Firebase config object with
`initializeApp({ /* config */ })` (the real value previously lived in git history) and provided
**no replacement mechanism**. The build still produced a bundle — but with no config — so the app
crashed at startup.

**Fix:** all Firebase configuration now flows through `REACT_APP_FIREBASE_*` environment variables.

- `.env` (git-ignored) holds the recovered real values.
- `.env.example` (committed) documents every variable with placeholders.
- CI injects the values from GitHub Actions secrets at build time.

---

## What was delivered

### Functional / UX
- Google sign-in with friendly, error-mapped feedback; sign-out.
- Live message stream (25 latest), oldest-first ordering, optimistic pending-message rendering.
- **Pagination:** "Load earlier messages" pages through full history without losing the live tail.
- Accessible **code-of-conduct dialog** replaces the original thread-blocking `alert()`.
- Send gating (empty/whitespace disabled), live character limit, trimmed writes.
- Safe avatar handling: https-only URLs + on-error initials fallback.
- Modern dark theme, responsive down to small phones, `prefers-reduced-motion` honored.

### Engineering
- Full migration from JavaScript to **strict TypeScript** (23 files).
- Clean module boundaries: `types/`, `utils/`, `firebase/`, `hooks/`, `components/`.
- Pure validation logic (`validation.ts`) shared by UI and mocked in tests.
- Data hook `useMessages` owns subscription + pagination; components are thin presenters.

### Security (`firestore.rules`)
- Reads: authenticated users only.
- Creates: exact schema (`hasOnly`), text 1–1000 chars, `uid == request.auth.uid`,
  displayName ≤100 chars, https-only photoURL ≤512 chars, `createdAt == request.time`
  (server-timestamp enforced — clients cannot forge ordering).
- Update/Delete: author-only. Composite index file included. Hosting gets security headers.

### Quality gates (all green)
| Gate | Result |
| --- | --- |
| `npm run lint` (0 warnings allowed) | 0 problems |
| `npm run typecheck` (`tsc --noEmit`) | 0 errors |
| `npm run test:ci` | **43/43 tests pass** (6 suites, + coverage) |
| `npm run build` | production build succeeds |
| `npm run format:check` | clean |

### CI/CD
- Both workflows gate production (merge) and preview (PR) deploys on
  lint → typecheck → tests → build, run on Node 20 with npm cache, and inject Firebase config
  from secrets. PR + issue templates added.

### Documentation
`README.md` • `docs/ARCHITECTURE.md` • `docs/DEPLOYMENT.md` • `docs/SECURITY.md` •
`docs/TESTING.md` • `CHANGELOG.md` • `LICENSE` (MIT)

---

## Technical decisions worth knowing

| Decision | Why |
| --- | --- |
| Stay on Create React App 5 | Vite migration was out of scope; CRA is stable for this app. |
| `typescript@4.9.5`, `@types/node@18` | Satisfy react-scripts 5 peer ranges; newer TS rejects the CRA types. |
| `module`/`moduleResolution: node16` | Required for Firestore 10's `exports`-map types to resolve. |
| `react-firebase-hooks@5.1.1` + ambient `.d.ts` | Package ships no typings; local shim keeps types strict. |
| Env-rules via `serverTimestamp` + `createdAt == request.time` | Ties ordering truth to the server; the client can't spoof clocks. |
| `@testing-library/user-event@14` | v13 predates `userEvent.setup()` used by our async interaction tests. |

---

## Verification evidence

```
$ npm run lint        → 0 problems
$ npm run typecheck   → exited 0
$ npm run test:ci     → Tests: 43 passed, 43 total
$ npm run build       → "The build folder is ready to be deployed."
```

---

## Action items for the owner (one-time, not blocking the commit)

1. **Add 8 GitHub Actions secrets** (see `docs/DEPLOYMENT.md`): the 7 `REACT_APP_FIREBASE_*`
   values and `FIREBASE_SERVICE_ACCOUNT_AK_CHAT_SERVER` (the service-account token the
   `firebase-hosting-*` workflows already reference).
2. **Deploy Firestore rules once:**
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```
   Hosting deploys do not ship the rules; until this runs, the chat renders read-only.
3. **Review and push `main`** — the merge workflow deploys to https://ak-chat-server.web.app/
   automatically, this time with working config.

## Optional follow-ups (tracked in CHANGELOG "Unreleased")

- Moderator tooling to remove offending messages.
- Message search / archive browser.
- Arabic/English localization.