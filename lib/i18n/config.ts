export const SUPPORTED_LOCALES = ["en", "zh-TW"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE_NAME = "novora_locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const INTERNAL_LOCALE_HEADER = "x-novora-request-locale";
export const OPEN_GRAPH_LOCALES: Record<SupportedLocale, string> = {
  en: "en_US",
  "zh-TW": "zh_TW",
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function resolveLocale(value: string | null | undefined): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function getOpenGraphAlternateLocales(
  locale: SupportedLocale,
): string[] {
  return SUPPORTED_LOCALES.filter(
    (supportedLocale) => supportedLocale !== locale,
  ).map((supportedLocale) => OPEN_GRAPH_LOCALES[supportedLocale]);
}
