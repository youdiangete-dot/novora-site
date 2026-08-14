import type { SupportedLocale } from "./config";

const FORMAT_LOCALES: Record<SupportedLocale, string> = {
  en: "en-US",
  "zh-TW": "zh-TW",
};

export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
) {
  return template.replace(/\{([^}]+)\}/g, (placeholder, key: string) => {
    const value = values[key];
    return value === undefined ? placeholder : String(value);
  });
}

export function formatDateTime(value: string, locale: SupportedLocale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(FORMAT_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateOnly(value: string, locale: SupportedLocale) {
  const isoDate = value.slice(0, 10);
  const date = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(FORMAT_LOCALES[locale], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
