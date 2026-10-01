/**
 * Supported locales.
 *
 * `ar` is a full RTL locale: switching to it also flips `dir="rtl"` on <html>,
 * so the layout mirrors without any per-component special-casing.
 */
export const LOCALES = ['en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export type Direction = 'ltr' | 'rtl';

export const LOCALE_META: Record<Locale, { label: string; dir: Direction; htmlLang: string }> = {
  en: { label: 'English', dir: 'ltr', htmlLang: 'en' },
  ar: { label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Maps an arbitrary BCP-47 tag such as `ar-EG` or `en-US` onto a supported locale. */
export function resolveLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const primary = tag.toLowerCase().split('-')[0];
  return isLocale(primary) ? primary : null;
}
