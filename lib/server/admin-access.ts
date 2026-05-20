import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_ACCESS_COOKIE_NAME = "novora_admin_access";
export const ADMIN_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ADMIN_ACCESS_COOKIE_PATH = "/";

const ADMIN_ACCESS_KEY_ENV = "NOVORA_ADMIN_ACCESS_KEY";
const ADMIN_ACCESS_COOKIE_MESSAGE = "novora-admin-briefs-access";

function readAdminAccessKey(): string | null {
  const value = process.env[ADMIN_ACCESS_KEY_ENV]?.trim();

  return value ? value : null;
}

function hashAdminAccessKey(value: string): string {
  return createHmac("sha256", value)
    .update(ADMIN_ACCESS_COOKIE_MESSAGE)
    .digest("hex");
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAccessConfigured(): boolean {
  return Boolean(readAdminAccessKey());
}

export function createAdminAccessCookieValue(submittedAccessKey: string): string | null {
  const expectedAccessKey = readAdminAccessKey();
  const normalizedSubmittedKey = submittedAccessKey.trim();

  if (!expectedAccessKey || !normalizedSubmittedKey) {
    return null;
  }

  const expectedHash = hashAdminAccessKey(expectedAccessKey);
  const submittedHash = hashAdminAccessKey(normalizedSubmittedKey);

  if (!timingSafeStringEqual(expectedHash, submittedHash)) {
    return null;
  }

  return expectedHash;
}

export function isValidAdminAccessCookie(cookieValue?: string): boolean {
  const expectedAccessKey = readAdminAccessKey();

  if (!expectedAccessKey || !cookieValue) {
    return false;
  }

  return timingSafeStringEqual(hashAdminAccessKey(expectedAccessKey), cookieValue);
}
