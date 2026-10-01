import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n, useT } from './context';
import { DEFAULT_LOCALE, LOCALE_META, isLocale, resolveLocale } from './locales';

const STORAGE_KEY = 'ak-chat:locale';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
});

describe('locale helpers', () => {
  it('recognises only supported locale tags', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(7)).toBe(false);
  });

  it('resolves regional BCP-47 tags onto a supported locale', () => {
    expect(resolveLocale('ar-EG')).toBe('ar');
    expect(resolveLocale('en-GB')).toBe('en');
    expect(resolveLocale('AR')).toBe('ar');
    expect(resolveLocale('fr-CA')).toBeNull();
    expect(resolveLocale(null)).toBeNull();
  });
});

describe('I18nProvider', () => {
  function Probe() {
    const { locale, dir, isRtl, t } = useI18n();
    return (
      <div>
        <span data-testid="locale">{locale}</span>
        <span data-testid="dir">{dir}</span>
        <span data-testid="rtl">{String(isRtl)}</span>
        <span data-testid="label">{t.communityChat}</span>
      </div>
    );
  }

  it('defaults to English when nothing is stored', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE);
    expect(screen.getByTestId('label')).toHaveTextContent('Community chat');
  });

  it('restores a persisted locale and applies lang/dir to the document', () => {
    window.localStorage.setItem(STORAGE_KEY, 'ar');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
    expect(screen.getByTestId('rtl')).toHaveTextContent('true');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('ignores an unsupported persisted value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'klingon');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE);
  });

  it('switches locale, persists it and flips the document direction back', async () => {
    const user = userEvent.setup();

    function Switcher() {
      const { locale, toggleLocale, t } = useI18n();
      return (
        <button type="button" onClick={toggleLocale}>
          {locale}:{t.communityChat}
        </button>
      );
    }

    render(
      <I18nProvider>
        <Switcher />
      </I18nProvider>
    );

    await user.click(screen.getByRole('button'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('button')).toHaveTextContent('ar');
    expect(screen.getByRole('button')).toHaveTextContent('دردشة المجتمع');

    await user.click(screen.getByRole('button'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('falls back to English outside a provider instead of throwing', () => {
    function Orphan() {
      const t = useT();
      return <span>{t.communityChat}</span>;
    }

    // No provider on purpose: a hard throw here would take down any isolated
    // component render, which is a worse failure than untranslated copy.
    expect(() => render(<Orphan />)).not.toThrow();
    expect(screen.getByText('Community chat')).toBeInTheDocument();
  });
});

describe('locale metadata', () => {
  it('marks Arabic as RTL and English as LTR', () => {
    expect(LOCALE_META.ar.dir).toBe('rtl');
    expect(LOCALE_META.ar.htmlLang).toBe('ar');
    expect(LOCALE_META.en.dir).toBe('ltr');
    expect(LOCALE_META.en.htmlLang).toBe('en');
  });
});

describe('act hygiene', () => {
  it('does not warn about updates outside act', () => {
    // Guards the provider against the act() noise that dominated the suite
    // before localisation.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    act(() => {
      unmount();
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
