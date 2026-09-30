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

- **Attachments / images** — needs a storage quota, a size and type allowlist, and an abuse plan
  (storage costs money and is trivially spammable). Not a small feature.
- **Message archive / full-text search** — search today covers only the loaded page window; real
  search means an Algolia/Typesense index or Firestore + a dedicated search collection.
- **Rate limiting** — a client can still write as fast as it likes; a Cloud Function or App Check
  would be the enforcement point.
- **Push notifications** — FCM, which needs permissions UX and a service worker.

## Deliberately out of scope for now

- **Migrating off Create React App.** CRA 5 is unmaintained, which is a real long-term risk, but a
  Vite migration is its own project. The current build is fast enough and CI is green. Revisit when
  a dependency starts blocking an upgrade.
- **A Content-Security-Policy.** It cannot be switched on safely without first validating the exact
  origins Firebase Auth and Firestore need in production; an untested CSP risks breaking sign-in.
  The other security headers (HSTS, `Permissions-Policy`, `nosniff`, `X-Frame-Options`,
  `Referrer-Policy`) are already set. Add CSP with `Content-Security-Policy-Report-Only` first.
- **A custom backend.** Firebase covers auth, database, and hosting. A server would add cost and
  operational burden for a community chat this size.

## Maintenance rules of thumb

- Every PR must keep `lint`, `typecheck`, `test:ci`, and `verify:build` green.
- Any change to `firestore.rules` needs a matching `firebase deploy --only firestore:rules`; the
  CI deploy does **not** ship rules.
- Never commit `.env` or any service-account JSON.
- Bump the version in `package.json` and add a `CHANGELOG.md` entry when releasing.
