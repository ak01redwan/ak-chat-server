import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignIn from './SignIn';
import { getFirebaseAuth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

const mockSignInWithPopup = signInWithPopup as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SignIn', () => {
  it('renders the sign-in screen', () => {
    render(<SignIn />);
    expect(screen.getByRole('heading', { name: 'Welcome to AK-CHAT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('signs in with Google through the configured auth instance', async () => {
    const user = userEvent.setup();
    mockSignInWithPopup.mockResolvedValue(undefined);

    render(<SignIn />);
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup).toHaveBeenCalledWith(getFirebaseAuth(), expect.any(GoogleAuthProvider));
  });

  it('shows a friendly error message when sign-in fails', async () => {
    const user = userEvent.setup();
    mockSignInWithPopup.mockRejectedValue(new Error('auth/network-request-failed'));

    render(<SignIn />);
    // The rejected popup promise sets the error on a later microtask, so the
    // click must settle inside act() to avoid an update-outside-act warning.
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('auth/network-request-failed');
  });

  it('ignores the popup-closed-by-user error', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('Popup closed'), { code: 'auth/popup-closed-by-user' });
    mockSignInWithPopup.mockRejectedValue(error);

    render(<SignIn />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
