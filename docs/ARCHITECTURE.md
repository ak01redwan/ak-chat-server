# Architecture

AK-CHAT is a **client-only web app**: the browser embeds the Firebase SDK and talks directly to Firebase Authentication + Cloud Firestore. There is no self-hosted backend — Firebase plays that role.

## High-level data flow

```
Browser (React app)
   │
   ├── Firebase Auth  ── Google sign-in ──► identity: { uid, displayName, photoURL }
   │
   └── Cloud Firestore
         ├── messages (collection) ── real-time listener + pagination
         ├── presence (collection) ── online roster (heartbeat + freshness window)
         └── rules: author-only writes, schema validation
```

## Repository layout

```
public/                 # static assets, index.html, manifest, icons, OG image
src/
├── App.tsx             # entry component: config gate, theme, auth state, code-of-conduct modal
├── index.tsx           # React bootstrap + best-effort Analytics init
├── components/         # presentational + feature components
├── context/ThemeContext.tsx  # light/dark/system preference, persisted to localStorage
├── hooks/useMessages.ts      # real-time message stream + pagination state
├── hooks/usePresence.ts      # online roster (heartbeat write, freshness-window read)
├── firebase/           # SDK configuration, analytics, message writes
├── utils/validation.ts # pure validation / sanitization helpers
├── types/              # shared TypeScript types (Message, ReplyTo, MessageReactions)
├── index.css           # design tokens + global styles (light + dark)
└── App.css             # component styles
scripts/verify-build.js # build smoke test (guards against empty bundles)
firestore.rules         # Firestore security rules
firestore.indexes.json  # composite index manifest (currently empty)
firebase.json           # Hosting + Firestore + security headers config
.github/workflows/      # CI gates + Firebase Hosting deploy
docs/                   # this documentation set
```

## Component tree

```
App
├── ThemeProvider           (ThemeContext: light | dark | system)
├── ConfigurationError      (rendered when env vars are missing)
├── OfflineBanner           (navigator.onLine)
└── ChatApplication
    ├── useAuthState        (react-firebase-hooks/auth)
    ├── CodeOfConductModal  (sessionStorage-acknowledged)
    ├── Header              (+ usePresence → OnlineCount, ThemeToggle)
    ├── SignIn / SignOut
    └── ChatRoom
        ├── useMessages     (data hook)
        ├── search toolbar + day separators
        ├── ChatMessage     (one per message: reply quote, reactions, edit, actions)
        │   ├── ReactionsBar
        │   ├── MessageActions
        │   └── ConfirmationModal (delete)
        ├── SkeletonChat     (loading placeholder)
        └── Feedback         (error / empty states)
```

## Message flow

1. **Sending** — `ChatRoom.handleSubmit` → `validateMessage` (1–1000 chars, trimmed) → `sendMessage` writes `{ text, uid, displayName, photoURL, createdAt: serverTimestamp(), replyTo, reactions: {} }`. Own writes render immediately as "pending" with `createdAt: null`, then reconcile when the snapshot arrives.
2. **Receiving (live)** — `useMessages` subscribes with `onSnapshot` to the latest `PAGE_SIZE` (25) messages via `orderBy('createdAt', 'desc') + limit(25)`, dedupes by id, and renders oldest-first.
3. **Pagination (older)** — when the first page is full, `hasMore` becomes true. `loadOlder()` issues a second read using `startAfter(initialCursorRef)` / `startAfter(oldestCursorRef)` and merges older pages above the current list.
4. **Editing** — the author edits inline; `editMessage` writes only `{ text }`, and the rules require every other field to stay byte-identical.
5. **Deleting** — always behind a `ConfirmationModal`; rules allow only the original author.
6. **Reactions** — `setMessageReactions` writes only the `reactions` map; rules allow any signed-in user to change _only_ that map.
7. **Unmount** — the subscription is cleaned up in a `useEffect` cleanup.

## Presence model

Firestore has **no `onDisconnect`** (that is a Realtime Database feature), so presence is
implemented with a heartbeat:

- On sign-in the client writes `presence/{uid}` with `online: true` and `lastSeen: serverTimestamp()`.
- A `setInterval` refreshes `lastSeen` every 45 s.
- A presence record counts as _online_ only if `lastSeen` is within a 120 s freshness window.
- On `pagehide`/unmount the client writes `online: false`.

The freshness window makes the roster self-healing: a client that crashes without unregistering
simply drops out of the window, so stale "online" rows cannot accumulate.

## Key decisions

| Decision                                      | Rationale                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Stayed on Create React App 5                  | Migration to Vite was out of scope; CRA is supported and stable for this app.             |
| `module`/`moduleResolution: node16`           | Required so the Firestore/App types behind Firebase 10's `exports` map resolve.           |
| `typescript@4.9.5`, `@types/node@18`          | Matches react-scripts 5 peer ranges; newer majors break `tsc --noEmit`.                   |
| Git-ignored `.env` + committed `.env.example` | Real keys never ship; CI aligns via GitHub Actions secrets.                               |
| Code-of-conduct modal (not `alert()`)         | Accessible, focusable dialog; the original `alert()` blocked the thread and was unstyled. |
| `serverTimestamp` + client "pending"          | Optimistic-feeling UI without writing client clocks to Firestore.                         |
| Server-side rules re-validate everything      | Client validation is UX; rules are the enforcement boundary (defense in depth).           |
| Reactions as a map emoji → uid list           | One `updateDoc` per toggle, no read-modify-write race between concurrent reactors.        |
| Replies as a denormalized quote preview       | A reply renders instantly without a second read; it is a preview, not a live reference.   |
| Presence via heartbeat, not `onDisconnect`    | Firestore has no `onDisconnect`; a freshness window self-heals instead.                   |
| `verify:build` smoke check in CI              | A bundle can build "successfully" while being empty; this catches the exact prior outage. |

## Design system

Theming is defined as CSS custom properties in `src/index.css`, with a light and a dark palette
driven by a `data-theme` attribute on `<html>` (`ThemeContext` writes it and persists the choice
under `ak-chat:theme`; the default is `system`, which follows `prefers-color-scheme`). The design
includes responsive layouts down to small phones, visible focus states, `prefers-reduced-motion`
support, and semantic ARIA labels throughout.
