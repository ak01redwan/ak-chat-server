import { render, screen } from '@testing-library/react';
import App from './App';
import { useAuthState } from 'react-firebase-hooks/auth';
import { usePresence } from './hooks/usePresence';

jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

jest.mock('./components/ChatRoom', () => () => <div data-testid="mock-chat-room" />);

// Presence touches the real Firestore SDK; keep the App unit test hermetic.
// CRA sets `resetMocks: true`, so the return value is (re)set in beforeEach.
jest.mock('./hooks/usePresence', () => ({
  usePresence: jest.fn(),
}));

const mockedUseAuthState = useAuthState as jest.Mock;
const mockedUsePresence = usePresence as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  window.localStorage.clear();
  mockedUsePresence.mockReturnValue({
    onlineCount: 2,
    onlineUserIds: ['a', 'b'],
    ready: true,
    error: null,
  });
});

describe('App', () => {
  it('shows the sign-in screen for guests', () => {
    mockedUseAuthState.mockReturnValue([null, false, undefined]);

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome to AK-CHAT' })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chat-room')).not.toBeInTheDocument();
  });

  it('shows the chat room for a signed-in user', () => {
    mockedUseAuthState.mockReturnValue([{ uid: 'user-1' }, false, undefined]);

    render(<App />);
    expect(screen.getByTestId('mock-chat-room')).toBeInTheDocument();
  });

  it('renders a loading state while auth is settling', () => {
    mockedUseAuthState.mockReturnValue([undefined, true, undefined]);

    render(<App />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('surfaces auth errors', () => {
    mockedUseAuthState.mockReturnValue([null, false, new Error('auth/unavailable')]);

    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('auth/unavailable');
  });

  it('shows the code of conduct modal after signing in', () => {
    mockedUseAuthState.mockReturnValue([{ uid: 'user-1' }, false, undefined]);

    render(<App />);
    expect(screen.getByRole('dialog', { name: 'Community guidelines' })).toBeInTheDocument();
  });

  it('remembers an accepted code of conduct for the session', () => {
    sessionStorage.setItem('ak-chat:code-of-conduct-accepted', 'accepted');
    mockedUseAuthState.mockReturnValue([{ uid: 'user-1' }, false, undefined]);

    render(<App />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies the dark theme by default and offers a theme toggle', () => {
    mockedUseAuthState.mockReturnValue([null, false, undefined]);

    render(<App />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('shows how many users are online for a signed-in user', () => {
    mockedUseAuthState.mockReturnValue([{ uid: 'user-1' }, false, undefined]);

    render(<App />);
    expect(screen.getByTestId('online-count')).toHaveTextContent('2 online');
  });

  it('offers a skip link for keyboard users', () => {
    mockedUseAuthState.mockReturnValue([null, false, undefined]);

    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to chat' })).toHaveAttribute(
      'href',
      '#main-content'
    );
  });
});
