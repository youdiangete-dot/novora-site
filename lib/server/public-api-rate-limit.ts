import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type PublicApiRateLimitMode = "disabled" | "enforced" | "provider_error";

export type FixedWindowRateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
};

// Shared, unchanged intake policies; the dormant Worker rechecks these same
// counters without incrementing an already accepted submission a second time.
export const CONCEPT_BRIEF_ROUTE_NAME = "/api/concept-briefs";
export const CONCEPT_BRIEF_IP_RATE_LIMIT = Object.freeze({
  limit: 30, windowSeconds: 10 * 60, keyPrefix: "rl:v1:concept-briefs",
});
export const CONCEPT_BRIEF_EMAIL_RATE_LIMIT = Object.freeze({
  limit: 5, windowSeconds: 60 * 60, keyPrefix: "rl:v1:concept-briefs",
});

export type PublicApiRateLimitKeyProvenance = Readonly<{
  redisKey: string;
  subject: "ip" | "email";
  derivation: "hmac_sha256" | "sha256";
}>;

export type PublicApiRateLimitResult = {
  allowed: boolean;
  mode: PublicApiRateLimitMode;
  reason: string;
  retryAfterSeconds?: number;
  headers?: Record<string, string>;
  // Private server-only metadata from the key actually sent to a successful
  // Redis command. Never serialize to HTTP/logs. This is not paid admission,
  // customer identity/access proof, a key/policy version, or an HMAC signature.
  // The existing IP SHA fallback is explicitly distinguished from HMAC keys.
  keyProvenance?: PublicApiRateLimitKeyProvenance;
};

type PublicApiRateLimitInput = {
  routeName: string;
  request: Request;
  policy: FixedWindowRateLimitPolicy;
  normalizedEmail?: string | null;
  identifiers?: Record<string, string | null | undefined>;
};

type RedisProviderConfig = {
  url: string;
  token: string;
  family: "upstash" | "vercel_kv";
};

type RedisCommandResponse = {
  result?: unknown;
  error?: unknown;
};

const warnedOperationalSignals = new Set<string>();

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return tostring(current) .. ":" .. tostring(ttl)
`;

// These values drive both the actual derivation and its policy fingerprint.
// They contain implementation semantics, never signing material or key versions.
const KEY_DERIVATION = Object.freeze({
  algorithm: "sha256", hexLength: 48, separator: ":",
  inputEncoding: "utf8" as const, outputEncoding: "hex" as const,
  ipSubject: "ip" as const, emailSubject: "email" as const,
  forwardedHeaders: Object.freeze(["x-forwarded-for", "x-vercel-forwarded-for"]),
  fallbackHeaders: Object.freeze(["x-real-ip", "cf-connecting-ip"]),
  forwardedDelimiter: ",", missingIp: "unknown",
  trimIp: true, trimEmail: true, lowercaseEmail: true,
});
const ALLOW_AT_LIMIT = true;

export type EnforcedPublicApiRatePolicy = Readonly<{
  // Private metadata only. This does not authorize spending or customer access.
  rate_policy_version: string;
  key_version: string;
  ip: PublicApiRateLimitKeyProvenance;
  email: PublicApiRateLimitKeyProvenance;
}>;

type EnforcementReceipt = Readonly<{
  routeName: string;
  request: Request;
  policy: Readonly<FixedWindowRateLimitPolicy>;
  key: PublicApiRateLimitKeyProvenance;
  key_version: string;
}>;
// Shape, status, or a copied result cannot manufacture a successful operation.
const successfulEnforcement = new WeakMap<object, EnforcementReceipt>();

function ownData(value: object, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function snapshotPolicy(value: FixedWindowRateLimitPolicy): Readonly<FixedWindowRateLimitPolicy> | null {
  try {
    if (!value || typeof value !== "object") return null;
    const limit = ownData(value, "limit"), windowSeconds = ownData(value, "windowSeconds");
    const keyPrefix = ownData(value, "keyPrefix");
    return typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0 &&
      typeof windowSeconds === "number" && Number.isSafeInteger(windowSeconds) && windowSeconds > 0 &&
      typeof keyPrefix === "string" && keyPrefix.length > 0
      ? Object.freeze({ limit, windowSeconds, keyPrefix }) : null;
  } catch {
    return null;
  }
}

function samePolicy(a: Readonly<FixedWindowRateLimitPolicy>, b: Readonly<FixedWindowRateLimitPolicy>): boolean {
  return a.limit === b.limit && a.windowSeconds === b.windowSeconds && a.keyPrefix === b.keyPrefix;
}

/** Configuration fingerprint only; it is not evidence that Redis ran. */
export function derivePublicApiRatePolicyVersion(
  routeName: string, ipPolicy: FixedWindowRateLimitPolicy, emailPolicy: FixedWindowRateLimitPolicy,
): string | null {
  const ip = snapshotPolicy(ipPolicy), email = snapshotPolicy(emailPolicy);
  if (typeof routeName !== "string" || !routeName || !ip || !email) return null;
  // Tokenize the existing Lua script: formatting/comments outside string literals
  // do not change identity; quoted bytes and executable tokens do.
  const scriptTokens = (RATE_LIMIT_SCRIPT.match(
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--[^\r\n]*|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|==|~=|<=|>=|\.\.|[^\s]/g,
  ) ?? []).filter((token: string) => !token.startsWith("--"));
  return createHash("sha256").update(JSON.stringify({
    routeName, ip, email, scriptTokens, keyDerivation: KEY_DERIVATION, allowAtLimit: ALLOW_AT_LIMIT,
  }), "utf8").digest("hex");
}

/** Current configuration only, never an enforcement receipt or paid permit. */
export function readCurrentConceptBriefRateAuthority(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const secret = environment.NOVORA_INTERNAL_SIGNING_SECRET?.trim();
  if (!secret) return null;
  const rate_policy_version = derivePublicApiRatePolicyVersion(CONCEPT_BRIEF_ROUTE_NAME,
    CONCEPT_BRIEF_IP_RATE_LIMIT, CONCEPT_BRIEF_EMAIL_RATE_LIMIT);
  if (!rate_policy_version) return null;
  return {
    key_version: "rl-hmac-v1:" + createHmac("sha256", secret)
      .update("NOVORA:first-preview:limiter-key-version:v1", "utf8").digest("hex"),
    rate_policy_version, ip: CONCEPT_BRIEF_IP_RATE_LIMIT, email: CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
  };
}

/** Both receipts must originate from this limiter for this request and policies.
 * The result is private policy/enforcement metadata, never an admission permit.
 */
export function readEnforcedPublicApiRatePolicy(input: {
  routeName: string; request: Request;
  ipPolicy: FixedWindowRateLimitPolicy; emailPolicy: FixedWindowRateLimitPolicy;
  ipResult: unknown; emailResult: unknown;
}): EnforcedPublicApiRatePolicy | null {
  try {
    const ipPolicy = snapshotPolicy(input.ipPolicy), emailPolicy = snapshotPolicy(input.emailPolicy);
    if (!ipPolicy || !emailPolicy) return null;
    function read(result: unknown, subject: "ip" | "email", policy: Readonly<FixedWindowRateLimitPolicy>) {
      if (!result || typeof result !== "object") return null;
      const receipt = successfulEnforcement.get(result);
      if (!receipt || receipt.request !== input.request || receipt.routeName !== input.routeName ||
        !samePolicy(receipt.policy, policy) || receipt.key.subject !== subject ||
        receipt.key.derivation !== "hmac_sha256" || ownData(result, "allowed") !== true ||
        ownData(result, "mode") !== "enforced" || ownData(result, "reason") !== "within_limit") return null;
      const key = ownData(result, "keyProvenance");
      if (!key || typeof key !== "object" || ownData(key, "redisKey") !== receipt.key.redisKey ||
        ownData(key, "subject") !== subject || ownData(key, "derivation") !== receipt.key.derivation) return null;
      return receipt;
    }
    const ip = read(input.ipResult, "ip", ipPolicy), email = read(input.emailResult, "email", emailPolicy);
    if (!ip || !email || ip.key_version !== email.key_version) return null;
    // Recheck current intake authority; matching captured versions may be stale.
    const secret = readEnvValue("NOVORA_INTERNAL_SIGNING_SECRET");
    if (!secret) return null;
    const currentVersion = "rl-hmac-v1:" + createHmac("sha256", secret)
      .update("NOVORA:first-preview:limiter-key-version:v1", "utf8").digest("hex");
    const currentBytes = Buffer.from(currentVersion, "utf8");
    const capturedBytes = Buffer.from(ip.key_version, "utf8");
    if (capturedBytes.length !== currentBytes.length ||
      !timingSafeEqual(capturedBytes, currentBytes)) return null;
    const version = derivePublicApiRatePolicyVersion(input.routeName, ipPolicy, emailPolicy);
    return version ? Object.freeze({ rate_policy_version: version, key_version: ip.key_version, ip: ip.key, email: email.key }) : null;
  } catch {
    return null;
  }
}

function warnOnce(key: string, message: string, metadata: Record<string, string>) {
  if (warnedOperationalSignals.has(key)) {
    return;
  }

  warnedOperationalSignals.add(key);
  console.warn(message, metadata);
}

function readEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readRedisProviderConfig(routeName: string): RedisProviderConfig | null {
  const upstashUrl = readEnvValue("UPSTASH_REDIS_REST_URL");
  const upstashToken = readEnvValue("UPSTASH_REDIS_REST_TOKEN");
  const kvUrl = readEnvValue("KV_REST_API_URL");
  const kvToken = readEnvValue("KV_REST_API_TOKEN");

  if (upstashUrl && upstashToken) {
    return {
      url: upstashUrl,
      token: upstashToken,
      family: "upstash",
    };
  }

  if (kvUrl && kvToken) {
    return {
      url: kvUrl,
      token: kvToken,
      family: "vercel_kv",
    };
  }

  if (upstashUrl || upstashToken) {
    warnOnce("upstash_env_incomplete", "Public API rate limit provider env is incomplete.", {
      routeName,
      reason: "provider_env_incomplete",
      provider: "upstash",
    });
  }

  if (kvUrl || kvToken) {
    warnOnce("vercel_kv_env_incomplete", "Public API rate limit provider env is incomplete.", {
      routeName,
      reason: "provider_env_incomplete",
      provider: "vercel_kv",
    });
  }

  return null;
}

function createSha256Hash(value: string): string {
  return createHash(KEY_DERIVATION.algorithm).update(value, KEY_DERIVATION.inputEncoding)
    .digest(KEY_DERIVATION.outputEncoding).slice(0, KEY_DERIVATION.hexLength);
}

function createHmacHash(value: string, secret: string): string {
  return createHmac(KEY_DERIVATION.algorithm, secret).update(value, KEY_DERIVATION.inputEncoding)
    .digest(KEY_DERIVATION.outputEncoding).slice(0, KEY_DERIVATION.hexLength);
}

function getClientIpSource(request: Request): string {
  const trim = (value: string | null | undefined) => KEY_DERIVATION.trimIp ? value?.trim() : value;
  const forwardedFor =
    request.headers.get(KEY_DERIVATION.forwardedHeaders[0]) ?? request.headers.get(KEY_DERIVATION.forwardedHeaders[1]);
  const firstForwardedIp = trim(forwardedFor?.split(KEY_DERIVATION.forwardedDelimiter)[0]);

  return (
    firstForwardedIp ||
    trim(request.headers.get(KEY_DERIVATION.fallbackHeaders[0])) ||
    trim(request.headers.get(KEY_DERIVATION.fallbackHeaders[1])) ||
    KEY_DERIVATION.missingIp
  );
}

function buildIpKey(
  routeName: string, request: Request, policy: FixedWindowRateLimitPolicy, secret: string | null,
): PublicApiRateLimitKeyProvenance {
  const source = getClientIpSource(request);
  const hashInput = [routeName, KEY_DERIVATION.ipSubject, source].join(KEY_DERIVATION.separator);
  const keyHash = secret
    ? createHmacHash(hashInput, secret)
    : createSha256Hash(hashInput);

  return {
    redisKey: [policy.keyPrefix, KEY_DERIVATION.ipSubject, keyHash].join(KEY_DERIVATION.separator),
    subject: KEY_DERIVATION.ipSubject,
    derivation: secret ? "hmac_sha256" : "sha256",
  };
}

function buildEmailKey(
  routeName: string,
  normalizedEmail: string | null | undefined,
  policy: FixedWindowRateLimitPolicy,
  secret: string | null,
): PublicApiRateLimitKeyProvenance | null {

  if (!normalizedEmail || !secret) {
    return null;
  }

  return {
    redisKey: [policy.keyPrefix, KEY_DERIVATION.emailSubject,
      createHmacHash([routeName, KEY_DERIVATION.emailSubject, normalizedEmail].join(KEY_DERIVATION.separator), secret),
    ].join(KEY_DERIVATION.separator),
    subject: KEY_DERIVATION.emailSubject,
    derivation: "hmac_sha256",
  };
}

function createHeaders(
  policy: FixedWindowRateLimitPolicy,
  count: number,
  ttlSeconds: number,
): Record<string, string> {
  const retryAfterSeconds = Math.max(ttlSeconds, 1);
  const resetAtSeconds = Math.ceil(Date.now() / 1000) + retryAfterSeconds;

  return {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(policy.limit),
    "X-RateLimit-Remaining": String(Math.max(policy.limit - count, 0)),
    "X-RateLimit-Reset": String(resetAtSeconds),
  };
}

function parseFixedWindowResult(result: unknown): { count: number; ttlSeconds: number } | null {
  let values: [unknown, unknown] | null = null;

  if (typeof result === "string") {
    const [countValue, ttlValue] = result.split(":", 2);
    values = [countValue, ttlValue];
  } else if (Array.isArray(result) && result.length >= 2) {
    values = [result[0], result[1]];
  }

  if (!values) {
    return null;
  }

  const count = Number(values[0]);
  const ttlSeconds = Number(values[1]);

  if (!Number.isFinite(count) || !Number.isFinite(ttlSeconds)) {
    return null;
  }

  return {
    count,
    ttlSeconds,
  };
}

async function runFixedWindowCommand(
  provider: RedisProviderConfig,
  key: string,
  policy: FixedWindowRateLimitPolicy,
): Promise<{ count: number; ttlSeconds: number; expectedCounterShape: boolean }> {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", key, String(policy.windowSeconds)]),
  });

  if (!response.ok) {
    throw new Error(`provider_http_${response.status}`);
  }

  const body = (await response.json()) as RedisCommandResponse;

  if (body.error) {
    throw new Error("provider_command_error");
  }

  const parsed = parseFixedWindowResult(body.result);

  if (!parsed) {
    throw new Error("provider_response_error");
  }

  return {
    count: parsed.count,
    ttlSeconds: parsed.ttlSeconds > 0 ? parsed.ttlSeconds : policy.windowSeconds,
    expectedCounterShape: typeof body.result === "string" && /^[1-9]\d*:[1-9]\d*$/.test(body.result) &&
      Number.isSafeInteger(parsed.count) && parsed.count > 0 &&
      Number.isSafeInteger(parsed.ttlSeconds) && parsed.ttlSeconds > 0 && parsed.ttlSeconds <= policy.windowSeconds,
  };
}

export function normalizePublicApiRateLimitEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = KEY_DERIVATION.trimEmail ? value.trim() : value;
  return normalized ? KEY_DERIVATION.lowercaseEmail ? normalized.toLowerCase() : normalized : null;
}

export async function checkPublicApiRateLimit({
  routeName,
  request,
  policy,
  normalizedEmail,
}: PublicApiRateLimitInput): Promise<PublicApiRateLimitResult> {
  const policySnapshot = snapshotPolicy(policy);
  const provider = readRedisProviderConfig(routeName);

  if (!provider) {
    return {
      allowed: true,
      mode: "disabled",
      reason: "provider_env_missing",
    };
  }

  // One snapshot supplies both the Redis key and its private key identity.
  const secret = readEnvValue("NOVORA_INTERNAL_SIGNING_SECRET");
  const key = normalizedEmail
    ? buildEmailKey(routeName, normalizedEmail, policy, secret)
    : buildIpKey(routeName, request, policy, secret);

  if (!key) {
    return {
      allowed: true,
      mode: "disabled",
      reason: "email_signing_secret_missing",
    };
  }

  try {
    const keyVersion = key.derivation === "hmac_sha256" && secret
      ? "rl-hmac-v1:" + createHmac("sha256", secret)
        .update("NOVORA:first-preview:limiter-key-version:v1", "utf8").digest("hex")
      : null;
    const { count, ttlSeconds, expectedCounterShape } = await runFixedWindowCommand(provider, key.redisKey, policy);
    const headers = createHeaders(policy, count, ttlSeconds);

    if (count > policy.limit || (!ALLOW_AT_LIMIT && count === policy.limit)) {
      return {
        allowed: false,
        mode: "enforced",
        reason: "rate_limit_exceeded",
        retryAfterSeconds: Math.max(ttlSeconds, 1),
        headers,
        keyProvenance: key,
      };
    }

    const result: PublicApiRateLimitResult = {
      allowed: true,
      mode: "enforced",
      reason: "within_limit",
      headers,
      keyProvenance: key,
    };
    const finalPolicy = snapshotPolicy(policy);
    if (policySnapshot && finalPolicy && samePolicy(policySnapshot, finalPolicy) &&
      key.derivation === "hmac_sha256" && keyVersion !== null && expectedCounterShape) {
      successfulEnforcement.set(result, Object.freeze({
        request, routeName, policy: policySnapshot, key: Object.freeze({ ...key }), key_version: keyVersion,
      }));
    }
    return result;
  } catch {
    warnOnce(
      `${routeName}:${policy.keyPrefix}:provider_error`,
      "Public API rate limit provider failed; request allowed fail-open.",
      {
        routeName,
        reason: "provider_error",
      },
    );

    return {
      allowed: true,
      mode: "provider_error",
      reason: "provider_error",
    };
  }
}
