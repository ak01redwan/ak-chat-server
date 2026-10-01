import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { I18nProvider } from './i18n';

const STORAGE_KEY = 'ak-chat:locale';

/** Renders `ui` inside the real I18nProvider with a fixed locale. */
export function renderWithI18n(
  ui: React.ReactElement,
  { locale = 'en', ...options }: { locale?: 'en' | 'ar' } & RenderOptions = {}
): RenderResult {
  window.localStorage.setItem(STORAGE_KEY, locale);
  return render(ui, {
    wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    ...options,
  });
}

/** Reads the active locale out of the document, as the provider sets it. */
export function documentLocale(): { lang: string; dir: string } {
  return {
    lang: document.documentElement.getAttribute('lang') ?? '',
    dir: document.documentElement.getAttribute('dir') ?? '',
  };
}
