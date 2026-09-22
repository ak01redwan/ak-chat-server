import { LogoMark } from './icons';

/** Generic loading state used while auth / Firestore settle. */
export function LoadingState() {
  return (
    <div className="state" role="status">
      <div className="state__spinner" aria-hidden="true" />
      <p>Connecting…</p>
    </div>
  );
}

/** Inline banner for surfaced errors (auth, subscription, sending). */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="banner" role="alert">
      {message}
    </div>
  );
}

/** Friendly empty state for a brand-new chat room. */
export function EmptyState() {
  return (
    <div className="state">
      <span className="state__mark">
        <LogoMark size={40} />
      </span>
      <h2 className="state__title">No messages yet</h2>
      <p className="state__text">Be the first to say hello!</p>
    </div>
  );
}

/** Fatal configuration error shown when Firebase env vars are missing. */
export function ConfigurationError({ message }: { message: string }) {
  return (
    <div className="config-error">
      <span className="config-error__mark">
        <LogoMark size={48} />
      </span>
      <h1 className="config-error__title">AK-CHAT can't start</h1>
      <p className="config-error__message">{message}</p>
      <p className="config-error__hint">
        Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase web app
        credentials, then restart. See the deployment guide for details.
      </p>
    </div>
  );
}
