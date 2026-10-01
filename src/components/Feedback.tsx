import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { LogoMark, WifiOffIcon } from './icons';

/** Generic loading state used while auth settles. */
export function LoadingState() {
  const t = useT();
  return (
    <div className="state" role="status">
      <div className="state__spinner" aria-hidden="true" />
      <p>{t.connecting}</p>
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
  const t = useT();
  return (
    <div className="state">
      <span className="state__mark">
        <LogoMark size={40} />
      </span>
      <h2 className="state__title">{t.noMessagesYet}</h2>
      <p className="state__text">{t.noMessagesYetBody}</p>
    </div>
  );
}

/** Fatal configuration error shown when Firebase env vars are missing. */
export function ConfigurationError({ message }: { message: string }) {
  const t = useT();
  return (
    <div className="config-error">
      <span className="config-error__mark">
        <LogoMark size={48} />
      </span>
      <h1 className="config-error__title">{t.cannotStart}</h1>
      <p className="config-error__message">{message}</p>
      <p className="config-error__hint">{t.configHint('.env.example', '.env')}</p>
    </div>
  );
}

/**
 * Warns the user when the browser reports no connectivity. Firestore streams
 * automatically retry, so this is purely informational.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const t = useT();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiOffIcon size={16} />
      <span>{t.offlineBanner}</span>
    </div>
  );
}
