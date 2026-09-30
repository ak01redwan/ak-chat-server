import type { User } from 'firebase/auth';
import { usePresence } from '../hooks/usePresence';
import OnlineCount from './OnlineCount';
import SignOut from './SignOut';
import ThemeToggle from './ThemeToggle';
import { LogoMark } from './icons';

interface HeaderProps {
  user?: User | null;
}

export default function Header({ user }: HeaderProps) {
  const { onlineCount, ready } = usePresence(user ?? null);

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

      <div className="header__right">
        {user ? (
          <OnlineCount count={onlineCount} ready={ready} />
        ) : (
          <span className="header__guest">Guest</span>
        )}
        <ThemeToggle />
        {user && (
          <div className="header__user">
            <span className="header__greeting">
              {user.displayName ? `Hi, ${user.displayName.split(' ')[0]}` : 'Hi, there'}
            </span>
            <SignOut />
          </div>
        )}
      </div>
    </header>
  );
}
