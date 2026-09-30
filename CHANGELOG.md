# Changelog

All notable changes to AK-CHAT are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/) and is versioned with [SemVer](https://semver.org/).

## [1.1.0] - 2026-09-30

### Added

- **Emoji reactions** — one tap to toggle a reaction on any message; stored as a
  `reactions: { emoji: uid[] }` map so concurrent reactors never overwrite each other.
- **Quoted replies** — replying stores a denormalized `replyTo: { id, text, displayName }` preview
  on the new message, rendered as a quote above the bubble.
- **Inline editing** — the author can edit their own message text; `Escape` cancels, `Enter` saves.
- **Message deletion** — behind an accessible `ConfirmationModal` (`role="alertdialog"`, focus
  trapped, closes on `Escape`/overlay click).
- **Message search** — filter the loaded history by text and author from the toolbar.
- **Online presence** — a `presence/{uid}` roster with a 45 s heartbeat and a 120 s freshness
  window, surfaced as an online count in the header. Firestore has no `onDisconnect`, so liveness is
  derived from a server timestamp, which also self-heals after a crash.
- **Light / dark / system theme** — `ThemeContext` with `data-theme` on `<html>`, persisted to
  `localStorage` under `ak-chat:theme`, defaulting to the OS `prefers-color-scheme`.
- **Day separators** — messages are grouped under "Today" / "Yesterday" / absolute dates.
- **Quick emoji picker** — append common emoji to the draft without sending.
- **Skeletal loading state** — `SkeletonChat` shimmer placeholders instead of a bare spinner.
- **Offline banner** — reacts to `navigator.onLine` and tells the user the connection dropped.
- **Build smoke check** — `scripts/verify-build.js` (`npm run verify:build`) fails when
  `index.html`, the JS bundle, the CSS bundle, or the OG image are missing or empty; wired into both
  CI workflows so an empty bundle can never reach production again.
- **SEO / PWA polish** — Open Graph + Twitter cards, JSON-LD `WebApplication` schema, canonical
  link, `robots.txt`, `sitemap.xml`, and a 1200×630 `og-image.png`.
- **Docs** — `docs/ROADMAP.md`, and refreshed `README.md` / architecture / security / testing /
  deployment guides.
- **Firestore rules test suite** — `tests/firestore.rules.test.js`: 44 allow/deny assertions run
  against the Firestore emulator (`npm run test:rules`) via `@firebase/rules-unit-testing`.
  `firebase emulators:exec` boots and tears down the emulator, so no manual server is involved.
  Covers read auth, self-authored creates, forged `uid`, client-controlled timestamps, unexpected
  fields, text limits, reply-preview keys, the reaction allowlist, impersonation on edit,
  author-only delete, and self-only presence.
- **Static rules guard** — `npm run verify:rules` scans `firestore.rules` for Realtime-Database-only
  functions and for drift between the rules emoji allowlist and `REACTION_EMOJIS` in the client.
  `npm run verify:rules:self-test` proves the scan actually fails on known-bad rules (9 fixtures),
  so the guard cannot silently regress into a no-op.
- **Rules CI gate** — both workflows gained a `rules_tests` job (Java 21 + emulator) that the
  deploy jobs `needs`, so a rule that breaks writes can never reach production again.

### Changed

- `firestore.rules` rewritten for the new document shape: `hasOnly` now covers
  `text, uid, displayName, photoURL, createdAt, replyTo, reactions`; update is split into two
  explicit paths — the author may change only `text`, any signed-in user may change only
  `reactions` — and a new `presence/{uid}` match allows only self-writes with a server timestamp.
- `photoURL` is now **https-only** in both the rules and `sanitizePhotoURL`, matching the documented
  intent. The app is served over HTTPS, so a plaintext avatar was blocked as mixed content by the
  browser anyway; the documentation previously claimed https-only while the code accepted `http://`.
- `npm run verify` is now the single full gate: format check, lint, typecheck, static rules check,
  rules-checker self-test, rules emulator tests, app tests, build, and build verification.
- `src/firebase/messages.ts` gained `editMessage`, `deleteMessage`, and `setMessageReactions`.
- `src/index.css` and `src/App.css` rebuilt around design tokens with a full light and dark palette,
  visible focus states, and responsive layouts down to small phones.
- **Test suite grew 43 → 98 tests** (6 → 8 suites), including theme and confirmation-modal suites.
- Hosting headers extended with `Strict-Transport-Security` and `Permissions-Policy`.
- CI now runs `verify:build` between `build` and deploy.
- `test:ci` uses a 20 s per-test timeout to remove flakiness on slow Windows CI runners.

### Fixed

- **`firestore.rules` denied every message create in production.** The reactions validator used
  `list.all(...)`, a Realtime Database function that does not exist in Firestore rules. The deploy
  reported only a _warning_ and still said `compiled successfully`, so the broken rule shipped and
  the expression errored at request time. Replaced with an explicit per-emoji check (allowlist,
  list type, ≤50 reactors, ≤5 keys). Found by deploying and then testing behaviour, not by reading
  the file.
- **Authors could impersonate anyone on their own old messages.** `canEditOwnMessage()` compared
  `uid`, `createdAt`, `replyTo` and `reactions` against the stored document but omitted
  `displayName` and `photoURL`, so an author could edit a message and set their display name to
  "Moderator". Both fields are now immutable on edit.
- **`verify:rules` could not have caught the original bug.** Its pattern used a `(?<![.\w])`
  lookbehind that skipped every receiver-style call, so `list.all(...)` — the exact shape that
  reached production — was invisible to it. The pattern now matches method calls as well.
- **`src/index.tsx` was committed empty (0 bytes)** — this was the live site's actual outage. CRA
  reported a successful build while emitting an empty `main.*.js`, so users saw a blank page.
  Restored, and `verify:build` now fails the build if it ever regresses.
- Test-environment gaps that made the suite unreliable: `window.matchMedia` and
  `navigator.clipboard` were missing in jsdom, and CRA's `resetMocks: true` wiped module-level mock
  implementations between tests. All three are documented in `docs/TESTING.md`.
- `docs/SECURITY.md` claimed the reaction map allowed 8 distinct emoji keys; the rule allows 5.

## [1.0.0] - 2026-09-22

### Added

- **Environment-based Firebase configuration** — all Firebase settings now come from `REACT_APP_*` variables (`.env`, git-ignored) with a committed `.env.example`. This fixes the previously-broken live site, where the config object had been stripped from source after being committed to git history (secret hygiene) without a replacement mechanism.
- **Firestore security rules** (`firestore.rules`) — auth-required reads, strict schema validation on create (`hasOnly`, 1–1000 char text, self-authored `uid`, https-only `photoURL` ≤512 chars, server-time `createdAt`), author-only update/delete. Includes `firestore.indexes.json`.
- **Hosting security & caching headers** — immutable cache for hashed assets, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **Require zero-warning ESLint** over the whole `src` tree, plus Prettier formatting, `.editorconfig`, `.nvmrc`, MIT `LICENSE`.
- **CI/CD hardening** — `firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` now gate deploys on lint → typecheck → tests → build, inject Firebase config from GitHub Actions secrets, and pin Node 20 with npm caching. PR and issue templates added.
- **Community guidelines dialog** — replaces the original blocking `alert()` with an accessible modal (auto-focused Accept) remembered per-browser via `sessionStorage`.
- **Pagination** — the latest 25 messages stream live; older history loads on demand, maintaining a stable sort (`useMessages` hook).
- **Dark, modern UI** — tokenized styles (`#0b1120` / `#22d3ee` palette), responsive layout, `prefers-reduced-motion`, branded icons/manifest/SEO tags, generated PNG/ICO assets.
- **Test suite (43 tests)** — validation, hooks (subscription, pagination, unmount cleanup), sign-in flows, message rendering & sanitization, chat room interactions, app-level auth routing.
- **Documentation set** — `README.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `CHANGELOG.md`.

### Changed

- Migrated all application source from JavaScript to **TypeScript** (strict).
- Original `App.js` (`alert()`-based code of conduct, broken `class`/`className` usage) replaced with a typed, testable component tree.
- `package.json` rewritten: pinned compatible toolchain versions (TypeScript 4.9.5, `@types/node` 18, `@testing-library/user-event` 14), engines contract (Node ≥18), `test:ci`/`lint`/`typecheck`/`format` scripts.
- `.gitignore` hardened; removed tracked `.firebase/` cache.
- Removed dead code (`web-vitals` reporting) and CRA boilerplate (`logo.svg`, sample `App.test.js`).
- New PNG favicon/app icons and rewritten `public/index.html` + `manifest.json`.

### Fixed

- Live site failure caused by `initializeApp({ /* config */ })` — configuration now resolved at build time from env vars.
- Missing `logo192`/`logo512` assets referenced by the manifest.
- Unstyled, thread-blocking code-of-conduct alert.

## [Unreleased]

### Planned

- Typing indicators.
- Moderator tooling for removing offending messages (rules already permit author-only deletes).
- Arabic/English localization of UI strings.
- Message attachments / image uploads (needs a storage quota and abuse controls first).

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full plan.
