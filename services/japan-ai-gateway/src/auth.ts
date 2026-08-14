import { timingSafeEqual } from "node:crypto";

export function isAuthorized(
  authorizationHeader: string | undefined,
  expectedToken: string,
): boolean {
  const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader ?? "");
  if (!match) return false;

  const supplied = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
