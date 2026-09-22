# Security

This document describes the security model and the controls in place. AK-CHAT is a public community chat — the goal is safe, open participation with no secrets exposed and no data corrupted.

## Threat model

- **Unwanted writes** — anonymous or inauthentic traffic writing to the chat.
- **Data corruption** — oversized text, wrong field types, forged authorship.
- **Malicious content** — script URLs in avatars, HTML injection, oversized payloads.
- **Secret leakage** — Firebase API key, service-account JSON, or local `.env` ending up in the repo.
- **Abuse** — spam or harassment (addressed by community guidelines + moderation).

## Controls

### 1. Firestore security rules (`firestore.rules`)

The rules are the enforcement boundary. Summary:

- **Reads:** authenticated users only; `list` requires auth, which the app satisfies after sign-in.
- **Create** (new message) requires ALL of:
  - Document contains **exactly** `text`, `uid`, `displayName`, `photoURL`, `createdAt` (`hasOnly`).
  - `text` is a string of 1–1000 characters.
  - `uid == request.auth.uid` — you can only post as yourself.
  - `displayName` is `string | null`, at most 100 characters.
  - `photoURL` is `string | null`, passes the `validPhotoURL` check (https:// only, ≤512 chars).
  - `createdAt == request.time` — timestamps must come from the server context, preventing client-controlled clocks.
- **Update/Delete:** only the original author (`resource.data.uid == request.auth.uid`) of a message that already satisfies the schema.

### 2. Server timestamp

`createdAt` is written with `serverTimestamp()`; rules assert `createdAt == request.time`. Clients cannot inject arbitrary timestamps, which keeps ordering honest.

### 3. Input validation & sanitization (`src/utils/validation.ts`)

Client-side validation mirrors the rules (length limits, trimming) and `sanitizePhotoURL` enforces https-only avatar URLs before they reach the DOM, with a graceful fallback to initials on load error.

### 4. Client configuration hardening

- **No hard-coded keys in source.** Firebase config comes from `REACT_APP_*` env vars; only `.env.example` is committed.
- `.gitignore` excludes `.env`, `.env.*` and `.firebase/` (a Firebase cache previously committed).
- CI injects config from GitHub Actions secrets, never from the repo.
- Firebase API keys are public by design for the client SDK — the real protection is the rules layer, not the key.

### 5. Hosting security headers (`firebase.json`)

- `Cache-Control: max-age=31536000, immutable` for hashed JS/CSS assets (immutable hashed builds).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`

### 6. The application layer

- **Code-of-conduct dialog** on first visit (previously a blocking `alert()`).
- **Accessible, controlled UI** — send button disabled for empty/whitespace drafts; character limit enforced.
- React 18 defaults handle text escaping; avatar URLs are sanitized before use.
- Google sign-in errors are mapped to friendly messages; "popup closed" is silently ignored.

## Operational rules of thumb

- Deploy rules with `firebase deploy --only firestore` whenever `firestore.rules` changes.
- Never push a local `.env` or a service account JSON to the repository.
- Review PRs build only from branch builds; the merge workflow is the only path to production.

## Reporting a vulnerability

Open a private issue or reach out to the maintainer (see README links). Do not post credentials in issues or PRs.
