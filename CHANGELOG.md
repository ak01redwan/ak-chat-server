# Changelog

All notable changes to AK-CHAT are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/) and is versioned with [SemVer](https://semver.org/).

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

- Moderator tooling for removing offending messages (rules already permit author-only deletes).
- Message search/history archive browser.
- Localized (Arabic/English) UI strings.
