import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '../context/ThemeContext';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('applies the dark theme by default when the OS has no light preference', () => {
    renderToggle();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('switches to the light theme and persists the choice', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem('ak-chat:theme')).toBe('light');
  });

  it('switches back to the dark theme', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('ak-chat:theme')).toBe('dark');
  });

  it('restores a stored preference on mount', () => {
    window.localStorage.setItem('ak-chat:theme', 'light');

    renderToggle();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
