import "server-only";

import { createHash, createHmac } from "node:crypto";

export type PublicApiRateLimitMode = "disabled" | "enforced" | "provider_error";

export type FixedWindowRateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
};

export type PublicApiRateLimitResult = {
  allowed: boolean;
  mode: PublicApiRateLimitMode;
  reason: string;
  retryAfterSeconds?: number;
  headers?: Record<string, string>;
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
return { current, ttl }
`;

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
  return createHash("sha256").update(value).digest("hex").slice(0, 48);
}

function createHmacHash(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 48);
}

function getClientIpSource(request: Request): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-vercel-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function buildIpKey(routeName: string, request: Request, policy: FixedWindowRateLimitPolicy): string {
  const source = getClientIpSource(request);
  const secret = readEnvValue("NOVORA_INTERNAL_SIGNING_SECRET");
  const keyHash = secret
    ? createHmacHash(`${routeName}:ip:${source}`, secret)
    : createSha256Hash(`${routeName}:ip:${source}`);

  return `${policy.keyPrefix}:ip:${keyHash}`;
}

function buildEmailKey(
  routeName: string,
  normalizedEmail: string | null | undefined,
  policy: FixedWindowRateLimitPolicy,
): string | null {
  const secret = readEnvValue("NOVORA_INTERNAL_SIGNING_SECRET");

  if (!normalizedEmail || !secret) {
    return null;
  }

  return `${policy.keyPrefix}:email:${createHmacHash(`${routeName}:email:${normalizedEmail}`, secret)}`;
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
  if (!Array.isArray(result) || result.length < 2) {
    return null;
  }

  const count = Number(result[0]);
  const ttlSeconds = Number(result[1]);

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
): Promise<{ count: number; ttlSeconds: number }> {
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
  };
}

export function normalizePublicApiRateLimitEmail(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

export async function checkPublicApiRateLimit({
  routeName,
  request,
  policy,
  normalizedEmail,
}: PublicApiRateLimitInput): Promise<PublicApiRateLimitResult> {
  const provider = readRedisProviderConfig(routeName);

  if (!provider) {
    return {
      allowed: true,
      mode: "disabled",
      reason: "provider_env_missing",
    };
  }

  const key = normalizedEmail
    ? buildEmailKey(routeName, normalizedEmail, policy)
    : buildIpKey(routeName, request, policy);

  if (!key) {
    return {
      allowed: true,
      mode: "disabled",
      reason: "email_signing_secret_missing",
    };
  }

  try {
    const { count, ttlSeconds } = await runFixedWindowCommand(provider, key, policy);
    const headers = createHeaders(policy, count, ttlSeconds);

    if (count > policy.limit) {
      return {
        allowed: false,
        mode: "enforced",
        reason: "rate_limit_exceeded",
        retryAfterSeconds: Math.max(ttlSeconds, 1),
        headers,
      };
    }

    return {
      allowed: true,
      mode: "enforced",
      reason: "within_limit",
      headers,
    };
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
