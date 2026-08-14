import { headers } from "next/headers";
import {
  INTERNAL_LOCALE_HEADER,
  resolveLocale,
  type SupportedLocale,
} from "./config";
import { getDictionary } from "./dictionaries";

export async function getRequestLocale(): Promise<SupportedLocale> {
  const requestHeaders = await headers();
  return resolveLocale(requestHeaders.get(INTERNAL_LOCALE_HEADER));
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    dictionary: getDictionary(locale),
  } as const;
}
