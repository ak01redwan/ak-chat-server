import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { getFirebaseAuth } from '../firebase/config';
import { GoogleIcon, LogoMark } from './icons';

const POPUP_CLOSED_CODE = 'auth/popup-closed-by-user';

interface SignInError {
  message: string;
}

/** Maps FirebaseAuth errors to friendly, human-readable messages. */
function friendlyError(error: unknown): SignInError | null {
  if (!(error instanceof Error)) {
    return { message: 'Something went wrong during sign-in.' };
  }

  const code = (error as FirebaseError).code;

  if (code === POPUP_CLOSED_CODE) {
    // The user closed the popup — this is not an error we need to show.
    return null;
  }

  if (code === 'auth/popup-blocked') {
    return {
      message: 'The sign-in popup was blocked by your browser. Allow popups and try again.',
    };
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return {
      message: 'An account with this email already exists using a different sign-in method.',
    };
  }

  if (code === 'auth/network-request-failed') {
    return { message: 'Network problem. Check your connection and try again.' };
  }

  if (code === 'auth/too-many-requests') {
    return { message: 'Too many attempts. Wait a moment and try again.' };
  }

  return { message: error.message };
}

const FEATURES = [
  { title: 'Real-time', text: 'Messages appear instantly for everyone in the room.' },
  { title: 'Reactions & replies', text: 'React with emoji and quote messages you care about.' },
  { title: 'Your data, your rules', text: 'Edit or delete anything you post, any time.' },
];

export default function SignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <section className="signin" aria-label="Sign in to AK-CHAT">
      <div className="signin__card">
        <span className="signin__logo">
          <LogoMark size={44} />
        </span>

        <h2 className="signin__title">Welcome to AK-CHAT</h2>
        <p className="signin__intro">
          A real-time community chat for AK01REDWAN followers and friends. Join the conversation,
          share updates, and stay connected.
        </p>

        <button
          className="btn btn--google"
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
        >
          <GoogleIcon size={20} />
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="signin__error" role="alert">
            {error.message}
          </p>
        )}

        <ul className="signin__features">
          {FEATURES.map((feature) => (
            <li className="signin__feature" key={feature.title}>
              <strong>{feature.title}</strong>
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>

        <div className="signin__rules">
          <h3 className="signin__rules-title">Community guidelines</h3>
          <ul className="signin__rules-list">
            <li>Treat others kindly and avoid abusive language.</li>
            <li>Stick to the topic of AK01REDWAN's news and updates.</li>
            <li>Report any violations to moderators.</li>
          </ul>
          <p className="signin__disclaimer">
            Failure to follow these guidelines may result in warnings, suspension, or a ban.
          </p>
        </div>
      </div>
    </section>
  );
}
