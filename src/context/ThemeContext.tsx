import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
/** The user's explicit choice; 'system' follows the OS (default). */
export type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  /** The effective theme currently applied to the document. */
  theme: ThemeMode;
  /** The raw stored preference. */
  preference: ThemePreference;
  /** Sets the stored preference and re-resolves the effective theme. */
  setPreference: (next: ThemePreference) => void;
  /** Cycles between light and dark (explicit choice). */
  cycleTheme: () => void;
}

const THEME_KEY = 'ak-chat:theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/** Applies the effective theme to <html> and the browser chrome meta color. */
function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'light' ? '#f1f5f9' : '#0b1120');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemPrefersLight, setSystemPrefersLight] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    setSystemPrefersLight(media.matches);
    const onSystemChange = (event: MediaQueryListEvent) => setSystemPrefersLight(event.matches);
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  const theme: ThemeMode =
    preference === 'system' ? (systemPrefersLight ? 'light' : 'dark') : preference;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      window.localStorage.setItem(THEME_KEY, next);
      setPreferenceState(next);
    };

    const cycleTheme = () => {
      setPreference(theme === 'dark' ? 'light' : 'dark');
    };

    return { theme, preference, setPreference, cycleTheme };
  }, [theme, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return ctx;
}
