# Roadmap

Where AK-CHAT stands after the v1.1.0 audit, and what comes next.

## Shipped (v1.1.0)

- Rich messages: emoji reactions, quoted replies, inline editing, deletion with confirmation.
- Search across the loaded history, day separators, quick emoji picker.
- Online presence with a heartbeat and a freshness window.
- Light / dark / system theme, persisted per browser.
- Skeletal loading, offline banner, accessibility and responsive polish.
- SEO / PWA metadata, `robots.txt`, `sitemap.xml`, OG image.
- A `verify:build` CI gate that makes an empty bundle undeployable.
- 97 tests across 8 suites; lint, typecheck, and format all clean.

## Next (v1.2.0) — suggested order

### 1. Typing indicators

Firestore has no broadcast channel, so typing must be written as ephemeral documents
(`typing/{roomId}` with a server timestamp) and filtered by a freshness window, exactly like
presence. Needs a cleanup sweep so abandoned typing rows do not accumulate.

### 2. Localization (Arabic / English)

The UI is currently English-only while the audience is largely Arabic. Add a small `i18n` layer
(a dictionary module and a `useTranslation` hook are enough) rather than adopting a framework.
Also worth deciding: the RTL direction switch for Arabic.

### 3. Moderator tooling

Author-only deletes work, but a moderator cannot remove someone else's message. Add a
`moderators/{uid}` collection, a claim in the rules (`isModerator()`), and a minimal admin view.
Requires care: it is the first change that widens write permissions.

## Later

- **Move reactions to a subcollection** — today `reactions` is a map of `emoji → uid[]` inside the
  message document. Firestore rules cannot iterate a list, so the rules cap each list at 50 entries
  but cannot verify the uids are real users: a signed-in client can inject arbitrary strings and
  skew a reaction count. Storing reactions as `messages/{messageId}/reactions/{uid}` with the emoji
  as a field makes the uid unforgeable (the document id _is_ the auth uid), removes the list-length
  cap, and lets a Cloud Function maintain accurate counts. This is the highest-value security
  change on the list.
- **Attachments / images** — needs a storage quota, a size and type allowlist, and an abuse plan
  (storage costs money and is trivially spammable). Not a small feature.
- **Message archive / full-text search** — search today covers only the loaded page window; real
  search means an Algolia/Typesense index or Firestore + a dedicated search collection.
- **Rate limiting** — a client can still write as fast as it likes; a Cloud Function or App Check
  would be the enforcement point.
- **App Check** — the rules trust the Firebase Auth token. App Check would additionally prove a
  request came from this app rather than a hand-rolled HTTP client.
- **Push notifications** — FCM, which needs permissions UX and a service worker.

## Deliberately out of scope for now

- **Migrating off Create React App.** CRA 5 is unmaintained, which is a real long-term risk, but a
  Vite migration is its own project. The current build is fast enough and CI is green. Revisit when
  a dependency starts blocking an upgrade. Note that `npm audit` currently reports 0 findings in
  direct production dependencies; the remaining advisories are all in dev/build tooling that never
  reaches the browser. A Vite migration would also let the `firebase` SDK move to a current major.
- **A Content-Security-Policy.** It cannot be switched on safely without first validating the exact
  origins Firebase Auth and Firestore need in production; an untested CSP risks breaking sign-in.
  The other security headers (HSTS, `Permissions-Policy`, `nosniff`, `X-Frame-Options`,
  `Referrer-Policy`) are already set. Add CSP with `Content-Security-Policy-Report-Only` first.
- **A custom backend.** Firebase covers auth, database, and hosting. A server would add cost and
  operational burden for a community chat this size.

## Maintenance rules of thumb

- Every PR must keep `npm run verify` green: format, lint, typecheck, static rules check, rules
  self-test, **rules emulator tests**, app tests, build and build verification.
- Any change to `firestore.rules` needs a matching `firebase deploy --only firestore:rules`; the
  CI deploy does **not** ship rules.
- **A successful `firebase deploy` is not evidence that the rules work.** It reports
  `compiled successfully` even when the file contains functions that do not exist. Run
  `npm run test:rules` before deploying.
- Rules tests need a JDK 21. CI installs it via `actions/setup-java`; locally install Temurin.
- Never commit `.env` or any service-account JSON.
- Bump the version in `package.json` and add a `CHANGELOG.md` entry when releasing.
