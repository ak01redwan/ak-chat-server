import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/config';
import { SignOutIcon } from './icons';

export default function SignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut(getFirebaseAuth());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed.');
      setSigningOut(false);
    }
  }

  return (
    <div className="header__actions">
      {error && (
        <span className="header__error" role="alert">
          {error}
        </span>
      )}
      <button
        className="btn btn--ghost"
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <SignOutIcon size={16} />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
