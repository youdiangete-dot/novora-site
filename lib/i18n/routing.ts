import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "./config";

const ZH_TW_PREFIX = "/zh-TW";
const PHASE_1_STATIC_PATHS = new Set([
  "/",
  "/design/start",
  "/design/concept",
  "/design/brief",
  "/design/submitted",
  "/design/sketch",
  "/design/pro-cad",
]);
const PHASE_1_PREVIEW_PATH =
  /^\/design\/preview\/NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;

export type ParsedLocalePath = {
  locale: SupportedLocale;
  pathname: string;
  hasLocalePrefix: boolean;
};

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");
  const suffixIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), path.length);

  return {
    pathname: path.slice(0, suffixIndex),
    suffix: path.slice(suffixIndex),
  };
}

export function parseLocalePath(pathname: string): ParsedLocalePath {
  if (pathname === ZH_TW_PREFIX) {
    return {
      locale: "zh-TW",
      pathname: "/",
      hasLocalePrefix: true,
    };
  }

  if (pathname.startsWith(`${ZH_TW_PREFIX}/`)) {
    return {
      locale: "zh-TW",
      pathname: pathname.slice(ZH_TW_PREFIX.length),
      hasLocalePrefix: true,
    };
  }

  return {
    locale: DEFAULT_LOCALE,
    pathname,
    hasLocalePrefix: false,
  };
}

export function removeLocalePrefix(path: string): string {
  const { pathname, suffix } = splitPathSuffix(path);
  const parsed = parseLocalePath(pathname);
  return `${parsed.pathname}${suffix}`;
}

export function isPhase1CustomerPath(pathname: string): boolean {
  return (
    PHASE_1_STATIC_PATHS.has(pathname) ||
    PHASE_1_PREVIEW_PATH.test(pathname)
  );
}

export function localizePath(path: string, locale: SupportedLocale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;

  const { pathname, suffix } = splitPathSuffix(path);
  const unprefixedPathname = parseLocalePath(pathname).pathname;

  if (!isPhase1CustomerPath(unprefixedPathname)) return path;
  if (locale === DEFAULT_LOCALE) return `${unprefixedPathname}${suffix}`;

  const localizedPathname =
    unprefixedPathname === "/"
      ? ZH_TW_PREFIX
      : `${ZH_TW_PREFIX}${unprefixedPathname}`;

  return `${localizedPathname}${suffix}`;
}
