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
  - Document contains **exactly** `text`, `uid`, `displayName`, `photoURL`, `createdAt`, `replyTo`, `reactions` (`hasOnly`).
  - `text` is a string of 1–1000 characters.
  - `uid == request.auth.uid` — you can only post as yourself.
  - `displayName` is `string | null`, at most 100 characters.
  - `photoURL` is `string | null`, passes the `validPhotoURL` check (https:// only, ≤512 chars).
  - `createdAt == request.time` — timestamps must come from the server context, preventing client-controlled clocks.
  - `replyTo` is either `null` or a map with **only** `id`, `text`, `displayName` (a quote preview).
  - `reactions` is a map of emoji → list of uids. Keys must come from the allowlist (the 5 emoji the client offers), at most 5 distinct keys and 50 reactors per emoji.
- **Update — path A (edit):** the author may change **only** `text`. `uid`, `createdAt`, `displayName`, `photoURL`, `replyTo`, and `reactions` must remain byte-identical to the stored document. Keeping the author's own name and avatar immutable is what stops an author from rewriting their identity on an old message to impersonate someone else.
- **Update — path B (react):** any signed-in user may change **only** the `reactions` map. `text`, `uid`, `displayName`, `photoURL`, and `replyTo` must remain byte-identical.
- **Delete:** only the original author (`resource.data.uid == request.auth.uid`).
- **Presence** (`presence/{uid}`): readable by any signed-in user, writable **only** by the matching uid, with a `hasOnly` field set and `lastSeen == request.time` (server timestamp). Nobody can mark someone else online.

### 2. Server timestamp

`createdAt` (messages) and `lastSeen` (presence) are written with `serverTimestamp()`; rules assert
they equal `request.time`. Clients cannot inject arbitrary timestamps, which keeps ordering honest
and prevents a client from faking its own presence.

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
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

> **Content-Security-Policy is deliberately not set yet.** The app talks to several Firebase
> origins (Auth, Identity Toolkit, Firestore, secure token) and loads Google Fonts, so a CSP must
> be written and validated against the real backend before it can be enabled. Shipping an
> untested CSP would risk breaking sign-in in production. Tracked in [ROADMAP.md](ROADMAP.md).

### 6. The application layer

- **Code-of-conduct dialog** on first visit (previously a blocking `alert()`).
- **Accessible, controlled UI** — send button disabled for empty/whitespace drafts; character limit enforced.
- React 18 defaults handle text escaping; avatar URLs are sanitized before use.
- Google sign-in errors are mapped to friendly messages; "popup closed" is silently ignored.

## Operational rules of thumb

- Deploy rules with `firebase deploy --only firestore:rules` whenever `firestore.rules` changes.
- Never push a local `.env` or a service account JSON to the repository.
- Review PRs build only from branch builds; the merge workflow is the only path to production.
- Run `npm run verify:rules` and `npm run test:rules` before deploying rules. A successful compile is **not** proof the rules work.

## Two bugs this layer already caught

These are recorded because they shaped how the rules are now tested.

**1. `list.all()` — a rules file that compiled and denied every write.**
Firestore Security Rules have no `all()`; that is a Realtime Database function. The deploy printed
only a _warning_ and still reported `compiled successfully`, so the broken rule reached production,
where it evaluated to an error and **denied every message create**. It is now replaced with an
explicit per-emoji check, and three independent guards prevent a repeat:

- `npm run verify:rules` — static scan for Realtime-Database-only functions, including
  receiver-style calls like `list.all(...)` (an earlier version of this scan used a
  `(?<![.\w])` lookbehind that silently skipped every method call and could never have caught it).
- `npm run verify:rules:self-test` — 9 fixtures proving the scan actually fails on known-bad rules,
  including the exact `list.all(...)` shape that caused the outage, and does not false-positive on
  comments or on `allowedReactionEmojis(`.
- `npm run test:rules` — 44 tests against the Firestore emulator asserting real allow/deny
  behaviour, including "allows a create carrying allowlisted reactions".

**2. An author could rename themselves on an old message.**
`canEditOwnMessage()` checked that `uid`, `createdAt`, `replyTo` and `reactions` were unchanged but
forgot `displayName` and `photoURL`, so an author could edit an old message and set their display
name to "Moderator". Caught by the emulator test _denies the author changing their own
displayName_, not by inspection. Both fields are now immutable on edit.

Both fixes are covered by regression tests, so neither can come back unnoticed.

## Known limitations

- **Reaction uid lists are not per-uid validated.** Firestore rules cannot iterate a list, so the
  rules cap the _length_ of each reaction's uid list but cannot check that those uids are real
  users. A signed-in client can put arbitrary strings in the list, which skews the count. Moving
  reactions to `messages/{id}/reactions/{uid}` (uid as the document id) makes the uid
  unforgeable and removes the count problem. Tracked in [ROADMAP.md](ROADMAP.md).
- **No App Check.** The rules trust the Firebase Auth token; App Check would additionally prove the
  request came from this app.
- **`react-scripts` 5.0.1 and `firebase` 10.x are behind.** Both carry published advisories in
  their build-time trees. `npm audit` reports 0 vulnerabilities in direct production dependencies,
  and the remaining findings are dev/build tooling that is not shipped to browsers, but both
  packages are effectively unmaintained. Tracked in [ROADMAP.md](ROADMAP.md).

## Reporting a vulnerability

Open a private issue or reach out to the maintainer (see README links). Do not post credentials in issues or PRs.
