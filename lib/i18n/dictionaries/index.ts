import type { SupportedLocale } from "../config";
import { enDictionary } from "./en";
import type { Dictionary } from "./types";
import { zhTWDictionary } from "./zh-TW";

const dictionaries: Record<SupportedLocale, Dictionary> = {
  en: enDictionary,
  "zh-TW": zhTWDictionary,
};

export function getDictionary(locale: SupportedLocale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary } from "./types";
