import { useI18n } from '../i18n';
import { LOCALE_META } from '../i18n/locales';

const SHORT: Record<string, string> = { en: 'EN', ar: 'ع' };

/**
 * Compact EN / ع switch. Renders as a single toggle button so it fits the
 * header on narrow screens; the accessible name always states the full target
 * language, not the abbreviation.
 */
export default function LocaleToggle() {
  const { locale, toggleLocale, t } = useI18n();
  const next = locale === 'en' ? 'ar' : 'en';
  const label = `${t.language}: ${LOCALE_META[next].label}`;

  return (
    <button
      type="button"
      className="btn btn--icon btn--locale"
      onClick={toggleLocale}
      aria-label={label}
      title={label}
      lang={LOCALE_META[next].htmlLang}
      data-testid="locale-toggle"
    >
      <span aria-hidden="true">{SHORT[locale]}</span>
    </button>
  );
}
