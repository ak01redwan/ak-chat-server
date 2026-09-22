import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { configError, getFirebaseAuth, isFirebaseConfigured } from './firebase/config';
import ChatRoom from './components/ChatRoom';
import CodeOfConductModal from './components/CodeOfConductModal';
import { ConfigurationError, ErrorBanner, LoadingState } from './components/Feedback';
import Header from './components/Header';
import SignIn from './components/SignIn';
import './App.css';

const CODE_OF_CONDUCT_KEY = 'ak-chat:code-of-conduct-accepted';

function ChatApplication() {
  const [user, authLoading, authError] = useAuthState(getFirebaseAuth());
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(
    () => sessionStorage.getItem(CODE_OF_CONDUCT_KEY) === 'accepted'
  );

  function handleAcceptCodeOfConduct() {
    sessionStorage.setItem(CODE_OF_CONDUCT_KEY, 'accepted');
    setCodeOfConductAccepted(true);
  }

  return (
    <div className="app-shell">
      <Header user={user} />

      <main className="app-main">
        {authError && <ErrorBanner message={authError.message} />}

        {user ? <ChatRoom user={user} /> : authLoading ? <LoadingState /> : <SignIn />}
      </main>

      {user && !codeOfConductAccepted && (
        <CodeOfConductModal onAccept={handleAcceptCodeOfConduct} />
      )}
    </div>
  );
}

/**
 * Renders the whole application. When Firebase is not configured (missing env vars)
 * we show a clear, actionable setup screen instead of a blank page or a crash.
 */
export default function App() {
  if (!isFirebaseConfigured) {
    return <ConfigurationError message={configError ?? 'Firebase is not configured.'} />;
  }

  return <ChatApplication />;
}
