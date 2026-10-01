import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import en from './en';
import ar from './ar';
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  LOCALES,
  isLocale,
  resolveLocale,
  type Locale,
} from './locales';

const STORAGE_KEY = 'ak-chat:locale';

const DICTIONARIES: Record<Locale, typeof en> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  t: typeof en;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  availableLocales: readonly Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * English fallback used when no provider is mounted (for example a component
 * rendered in isolation by a test). Translations are still real strings rather
 * than keys, so a missing provider degrades to English instead of showing the
 * user a raw key like "replyToMessage".
 */
const FALLBACK: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  dir: LOCALE_META[DEFAULT_LOCALE].dir,
  isRtl: false,
  t: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
  toggleLocale: () => {},
  availableLocales: LOCALES,
};

function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;

  const fromNavigator = resolveLocale(navigator.language);
  if (fromNavigator) return fromNavigator;

  // Secondary hint: many Arabic browsers still report "en-US".
  for (const candidate of navigator.languages ?? []) {
    const resolved = resolveLocale(candidate);
    if (resolved) return resolved;
  }

  return DEFAULT_LOCALE;
}

/**
 * Applies language/direction to the document so CSS logical properties,
 * screen readers and text selection all follow the active locale.
 */
function applyDocumentLocale(locale: Locale) {
  const root = document.documentElement;
  root.setAttribute('lang', LOCALE_META[locale].htmlLang);
  root.setAttribute('dir', LOCALE_META[locale].dir);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  }, [locale, setLocale]);

  const value = useMemo<I18nContextValue>(() => {
    const meta = LOCALE_META[locale];
    return {
      locale,
      dir: meta.dir,
      isRtl: meta.dir === 'rtl',
      t: DICTIONARIES[locale],
      setLocale,
      toggleLocale,
      availableLocales: LOCALES,
    };
  }, [locale, setLocale, toggleLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  return ctx ?? FALLBACK;
}

/** Convenience hook for components that only need strings. */
export function useT(): typeof en {
  return useI18n().t;
}
