import { render, screen } from '@testing-library/react';
import App from './App';
import { useAuthState } from 'react-firebase-hooks/auth';

jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(),
}));

jest.mock('./components/ChatRoom', () => () => <div data-testid="mock-chat-room" />);

const mockedUseAuthState = useAuthState as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
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
});
