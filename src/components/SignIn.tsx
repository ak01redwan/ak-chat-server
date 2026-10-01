import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { getFirebaseAuth } from '../firebase/config';
import { useT, type en } from '../i18n';
import { GoogleIcon, LogoMark } from './icons';

const POPUP_CLOSED_CODE = 'auth/popup-closed-by-user';

interface SignInError {
  message: string;
}

/** Maps FirebaseAuth errors to friendly, human-readable messages. */
function friendlyError(error: unknown, t: typeof en): SignInError | null {
  if (!(error instanceof Error)) {
    return { message: t.somethingWentWrongSignIn };
  }

  const code = (error as FirebaseError).code;

  if (code === POPUP_CLOSED_CODE) {
    // The user closed the popup — this is not an error we need to show.
    return null;
  }

  if (code === 'auth/popup-blocked') {
    return { message: t.popupBlocked };
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return { message: t.emailAccountExistsDifferent };
  }

  if (code === 'auth/network-request-failed') {
    return { message: t.networkProblem };
  }

  if (code === 'auth/too-many-requests') {
    return { message: t.tooManyAttempts };
  }

  return { message: error.message };
}

export default function SignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const t = useT();

  const features = [
    { title: t.realTimeTitle, text: t.realTimeText },
    { title: t.reactionsRepliesTitle, text: t.reactionsRepliesText },
    { title: t.yourDataTitle, text: t.yourDataText },
  ];

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <section className="signin" aria-label={t.signInTitle}>
      <div className="signin__card">
        <span className="signin__logo">
          <LogoMark size={44} />
        </span>

        <h2 className="signin__title">{t.welcomeTo}</h2>
        <p className="signin__intro">{t.welcomeIntro}</p>

        <button
          className="btn btn--google"
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
        >
          <GoogleIcon size={20} />
          {signingIn ? t.signingIn : t.continueWithGoogle}
        </button>

        {error && (
          <p className="signin__error" role="alert">
            {error.message}
          </p>
        )}

        <ul className="signin__features">
          {features.map((feature) => (
            <li className="signin__feature" key={feature.title}>
              <strong>{feature.title}</strong>
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>

        <div className="signin__rules">
          <h3 className="signin__rules-title">{t.communityGuidelines}</h3>
          <ul className="signin__rules-list">
            <li>{t.cocPoint1}</li>
            <li>{t.cocPoint2}</li>
            <li>{t.cocPoint3}</li>
          </ul>
          <p className="signin__disclaimer">{t.cocDisclaimer}</p>
        </div>
      </div>
    </section>
  );
}
