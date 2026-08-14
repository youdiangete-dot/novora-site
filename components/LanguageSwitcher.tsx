"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/i18n/client";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "../lib/i18n/config";
import {
  isPhase1CustomerPath,
  localizePath,
  parseLocalePath,
} from "../lib/i18n/routing";
import styles from "./SiteHeader.module.css";

function writeLocalePreference(locale: SupportedLocale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${LOCALE_COOKIE_NAME}=${locale}; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; ` +
    `Path=/; SameSite=Lax${secure}`;
}

function LanguageSwitcherControls() {
  const pathname = usePathname();
  const { dictionary, locale } = useI18n();
  const internalPathname = parseLocalePath(pathname).pathname;

  if (!isPhase1CustomerPath(internalPathname)) return null;

  function switchLocale(nextLocale: string) {
    if (!isSupportedLocale(nextLocale) || nextLocale === locale) return;

    const currentPath =
      window.location.pathname + window.location.search + window.location.hash;
    const nextPath = localizePath(currentPath, nextLocale);
    if (nextPath === currentPath) return;

    writeLocalePreference(nextLocale);
    window.location.assign(nextPath);
  }

  return (
    <div
      className={styles.languageSwitcher}
      role="group"
      aria-label={dictionary.common.languageSwitcher.label}
    >
      {SUPPORTED_LOCALES.map((optionLocale) => {
        const isActive = optionLocale === locale;

        return (
          <button
            key={optionLocale}
            type="button"
            className={`${styles.languageOption} ${
              isActive ? styles.languageOptionActive : ""
            }`}
            aria-label={dictionary.common.languageNames[optionLocale]}
            aria-pressed={isActive}
            onClick={() => switchLocale(optionLocale)}
          >
            {dictionary.common.languageSwitcher.shortNames[optionLocale]}
          </button>
        );
      })}
    </div>
  );
}

export default function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <span className={styles.languageSwitcherPlaceholder} aria-hidden="true" />
      }
    >
      <LanguageSwitcherControls />
    </Suspense>
  );
}
