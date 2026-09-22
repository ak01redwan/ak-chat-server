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
         └── rules: author-only writes, schema validation
```

## Repository layout

```
public/                 # static assets, index.html, manifest, icons
src/
├── App.tsx             # entry component: config gate, auth state, code-of-conduct modal
├── index.tsx           # React bootstrap + best-effort Analytics init
├── components/         # presentational + feature components
├── hooks/useMessages.ts# real-time message stream + pagination state
├── firebase/           # SDK configuration, analytics, message writes
├── utils/validation.ts # pure validation / sanitization helpers
├── types/              # shared TypeScript types
├── index.css           # design tokens + global styles
└── App.css             # component styles (dark theme)
firestore.rules         # Firestore security rules
firestore.indexes.json  # composite index manifest (currently empty)
firebase.json           # Hosting + Firestore + security headers config
.github/workflows/      # CI gates + Firebase Hosting deploy
docs/                   # this documentation set
```

## Component tree

```
App
├── ConfigurationError   (rendered when env vars are missing)
└── ChatApplication
    ├── useAuthState      (react-firebase-hooks/auth)
    ├── CodeOfConductModal (sessionStorage-acknowledged)
    ├── Header
    ├── SignIn / SignOut
    └── ChatRoom
        ├── useMessages    (data hook)
        ├── ChatMessage    (one per message)
        └── Feedback       (loading / error / empty states)
```

## Message flow

1. **Sending** — `ChatRoom.handleSubmit` → `validateMessage` (1–1000 chars, trimmed) → `sendMessage` writes `{ text, uid, displayName, photoURL, createdAt: serverTimestamp() }`. Own writes render immediately as "pending" with `createdAt: null`, then reconcile when the snapshot arrives.
2. **Receiving (live)** — `useMessages` subscribes with `onSnapshot` to the latest `PAGE_SIZE` (25) messages via `orderBy('createdAt', 'desc') + limit(25)`, dedupes by id, and renders oldest-first.
3. **Pagination (older)** — when the first page is full, `hasMore` becomes true. `loadOlder()` issues a second read using `startAfter(initialCursorRef)` / `startAfter(oldestCursorRef)` and merges older pages above the current list.
4. **Unmount** — the subscription is cleaned up in a `useEffect` cleanup.

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

## Design system

Dark theme defined as CSS custom properties in `src/index.css` (`--color-bg #0b1120`, `--color-accent #22d3ee`, etc.). Includes responsive layouts down to small phones, `prefers-reduced-motion` support, and semantic ARIA labels throughout.
