import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirebaseApp, isFirebaseConfigured } from './config';

/**
 * Initializes Google Analytics if the environment exposes a measurement ID.
 * Best-effort only: analytics must never break the app.
 */
export function initAnalytics(): void {
  if (!isFirebaseConfigured) return;

  isSupported()
    .then((supported) => {
      if (!supported) return;
      try {
        getAnalytics(getFirebaseApp());
      } catch {
        // Analytics is non-critical; ignore failures.
      }
    })
    .catch(() => {
      // Ignore analytics support-detection failures.
    });
}
