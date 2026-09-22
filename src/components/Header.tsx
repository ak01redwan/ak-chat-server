import type { User } from 'firebase/auth';
import SignOut from './SignOut';
import { LogoMark } from './icons';

interface HeaderProps {
  user?: User | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">
          <LogoMark size={26} />
        </span>
        <div className="header__titles">
          <h1 className="header__title">AK-CHAT</h1>
          <span className="header__subtitle">Community group chat</span>
        </div>
      </div>

      {user ? (
        <div className="header__user">
          <span className="header__greeting">Signed in as {user.displayName ?? 'you'}</span>
          <SignOut />
        </div>
      ) : (
        <span className="header__guest">Guest</span>
      )}
    </header>
  );
}
