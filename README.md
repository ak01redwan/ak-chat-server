# AK-CHAT

A real-time community chat room for friends and followers of **AK01REDWAN**. Sign in with Google, join the conversation, and stay up to date with news and updates.

**Live site:** https://ak-chat-server.web.app/

> Looking for the mobile client? See the separate repo: [AK-CHAT-Mobile-App](https://github.com/ak01redwan/ak-chat-mobile-app)

## Highlights

- **Plenty of room for anyone** — sign in with Google and join the conversation.
- **Real-time messaging** — new messages stream in live via Firestore.
- **Pagination** — the latest 25 messages load instantly; older history loads on demand.
- **Modern dark UI** — accessible, responsive, refreshed design.
- **Typed and tested** — TypeScript strict mode, 43 unit tests, lint + typecheck gates.
- **Community guidelines** — a code-of-conduct modal greets new visitors.

## Tech stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| UI       | React 18 (Create React App 5)             |
| Language | TypeScript (strict)                       |
| Auth     | Firebase Authentication (Google provider) |
| Data     | Cloud Firestore (real-time listener)      |
| Hosting  | Firebase Hosting                          |
| CI/CD    | GitHub Actions (build + deploy on `main`) |
| Quality  | ESLint, Prettier, Jest + Testing Library  |

## Getting started

### Prerequisites

- Node.js 20+ (an `.nvmrc` pins the recommended version)
- npm 9+
- A [Firebase](https://firebase.google.com/) project with **Authentication** (Google sign-in enabled), **Firestore** (in production mode), and **Hosting** — or use the existing `ak-chat-server` project.

### 1. Configure the environment

The app is configured entirely through environment variables (no hard-coded keys). Copy the template and fill in your Firebase Web App config:

```bash
cp .env.example .env
```

`.env` is git-ignored. The required values are: API key, Auth domain, Project ID, Storage bucket, Messaging sender ID, App ID, and Measurement ID.

### 2. Install and run

```bash
npm ci
npm start
```

Open http://localhost:3000 (or the URL shown by CRA).

### 3. Deploy Firestore rules (required once)

Hosting deploys do **not** deploy Firestore rules. Until the rules are live, message writes will be rejected:

```bash
firebase deploy --only firestore
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment guide, including the GitHub Actions secrets your CI needs.

## Available scripts

| Script                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm start`            | Runs the app in development mode              |
| `npm run lint`         | ESLint over `src` (fails on warnings)         |
| `npm run typecheck`    | `tsc --noEmit` type checks                    |
| `npm test`             | Jest in interactive watch mode                |
| `npm run test:ci`      | Runs the full suite once with coverage        |
| `npm run build`        | Production build to `build/`                  |
| `npm run format`       | Applies Prettier formatting                   |
| `npm run format:check` | Verifies formatting (CI gate)                 |
| `npm run deploy`       | Deploys the current build to Firebase Hosting |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — project layout, data flow, pagination, design decisions
- [Deployment](docs/DEPLOYMENT.md) — Firebase setup, GitHub Actions secrets, deploy/rollback
- [Security](docs/SECURITY.md) — Firestore rules, input validation, secrets handling
- [Testing](docs/TESTING.md) — test strategy, mocking patterns, running the suite
- [Changelog](CHANGELOG.md) — release notes

## Community guidelines

By joining AK-CHAT you agree to:

- Treat others kindly.
- Avoid abusive language.
- Stay on topic for AK01REDWAN's news and updates.
- Report violations to moderators.

Violations may result in removal. The full text is shown in-app on first visit.

## Links

- Live chat: https://ak-chat-server.web.app/
- Author: [AK01REDWAN](https://github.com/ak01redwan/) — [personal site](https://ak01redwan.is-a.dev/) · [Facebook](https://www.facebook.com/ak01redwan/)
- Mobile client: https://github.com/ak01redwan/ak-chat-mobile-app

## License

[MIT](LICENSE) © 2026 Abdulrahman Khalid Abdullah Redhwan
