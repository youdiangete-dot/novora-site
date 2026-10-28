import { expect, test } from "@playwright/test";
import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";

const internals = Module as unknown as {
  _resolveFilename(request: string, ...args: unknown[]): string;
};
const originalResolve = internals._resolveFilename;
const requireTest = createRequire(path.join(process.cwd(), "tests/e2e/beta-pilot-risk-authority.spec.ts"));
internals._resolveFilename = function (name, ...args) {
  return name === "server-only"
    ? requireTest.resolve("next/dist/compiled/server-only/empty.js")
    : originalResolve.call(this, name, ...args);
};
const modules = (() => {
  try {
    return {
      beta: requireTest("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission"),
      cost: requireTest("../../lib/server/ai-sketch/first-preview-cost-contract") as typeof import("../../lib/server/ai-sketch/first-preview-cost-contract"),
    };
  } finally { internals._resolveFilename = originalResolve; }
})();

// Existing local runtime only. Never start Redis/Docker, use cloud credentials,
// or touch BETA_LEDGER_KEY. Each fixture has a unique, retained synthetic key.
const cli = process.env.NOVORA_BETA_LOCAL_REDIS_CLI ?? "redis-cli";
let port: string;
const IDENTITY = "synthetic_pilot";
const MODE = "owner_expected_cost_single_attempt_v1";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const fingerprint = `${digest("synthetic-design")}:${digest("synthetic-instruction")}`;
type Authority = Record<string, unknown>;
type Ledger = { version: number; authority: Authority; reservations: Record<string, Record<string, unknown>> };
type Fixture = { key: string; authorityId: string; expiresAt: number };

function cliArgs(args: string[]): string[] {
  return ["--raw", "-h", "127.0.0.1", "-p", port, ...args];
}
function redis(...args: string[]): string {
  return execFileSync(cli, cliArgs(args), {
    encoding: "utf8", timeout: 5000, windowsHide: true,
    env: { ...process.env, REDISCLI_AUTH: "", REDISCLI_USER: "" },
  }).trimEnd();
}
function redisAsync(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cli, cliArgs(args), {
      encoding: "utf8", timeout: 5000, windowsHide: true,
      env: { ...process.env, REDISCLI_AUTH: "", REDISCLI_USER: "" },
    }, (error, stdout) => error ? reject(error) : resolve(stdout.trimEnd()));
  });
}
function pilot(expiresAt: number, authorityId: string): Authority {
  return {
    id: authorityId, ownerApproved: true, durabilityVerified: true,
    currency: "USD", pricingVersion: modules.cost.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    expiresAt, costAuthorityMode: MODE, ownerCostRiskAccepted: true,
    costCeilingVerified: false, limitMicros: 1_000_000, attemptReservationMicros: 1_000_000,
    expectedCostMicros: 100_000, invitedIdentity: IDENTITY,
    maximumExperiences: 1, maximumImages: 1, maximumPaidAttempts: 1, automaticPaidRetries: false,
  };
}
function fixture(patch: Authority = {}): Fixture {
  const key = `novora:local-pilot-risk:${randomUUID()}`;
  const authorityId = `synthetic_${randomUUID().replaceAll("-", "")}`;
  const expiresAt = Number(redis("TIME").split(/\r?\n/)[0]) + 3600;
  expect(redis("SET", key, JSON.stringify({ version: 1, authority: { ...pilot(expiresAt, authorityId), ...patch }, reservations: {} }), "NX")).toBe("OK");
  return { key, authorityId, expiresAt };
}
function read(f: Fixture): Ledger { return JSON.parse(redis("GET", f.key)); }
function write(f: Fixture, value: Ledger) {
  expect(redis("SET", f.key, JSON.stringify(value), "XX")).toBe("OK");
}
function command(f: Fixture, operation = "reserve", key = "request", brief = "synthetic-brief", identity = IDENTITY, roster = `|${IDENTITY}|`, inputFingerprint = fingerprint): string[] {
  return ["EVAL", modules.beta.BETA_ADMISSION_SCRIPT, "1", f.key,
    operation, f.authorityId, modules.cost.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    String(modules.cost.FIRST_PREVIEW_COST_CONTRACT.lifetimeBudgetPerConceptBriefMicros),
    identity, digest(key), brief, inputFingerprint, roster];
}
function run(f: Fixture, ...args: Parameters<typeof command> extends [Fixture, ...infer Rest] ? Rest : never): string {
  return redis(...command(f, ...args));
}

test("real local Lua: isolated Preview accepts only the bound one-image risk authority", () => {
  const configured = process.env.NOVORA_BETA_LOCAL_REDIS_TEST_PORT;
  if (!configured || !/^\d{1,5}$/.test(configured) || Number(configured) < 1 || Number(configured) > 65535) {
    throw new Error("BLOCKED: an existing disposable local Redis fixture runtime is required");
  }
  port = configured;
  expect(redis("PING")).toBe("PONG");
  const binding = digest(randomUUID());
  const key = `novora:beta-admission:m2-e2e:v1:${binding}`;
  const authorityId = `m2e2e_${binding.slice(0, 56)}`;
  const expiresAt = Number(redis("TIME").split(/\r?\n/)[0]) + 1800;
  const value = { version: 1, authority: { ...pilot(expiresAt, authorityId), runtimeBinding: binding }, reservations: {} };
  expect(redis("SET", key, JSON.stringify(value), "NX")).toBe("OK");
  const evalScript = (operation: string, brief: string, suppliedBinding = binding) => redis(
    "EVAL", modules.beta.M2_PREVIEW_ADMISSION_SCRIPT, "1", key, operation, authorityId,
    modules.cost.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    String(modules.cost.FIRST_PREVIEW_COST_CONTRACT.lifetimeBudgetPerConceptBriefMicros),
    IDENTITY, digest("request"), brief, fingerprint, `|${IDENTITY}|`, suppliedBinding,
  );
  expect(evalScript("reserve", "brief-a", digest("wrong"))).toBe("denied");
  expect(evalScript("reserve", "brief-a")).toBe("reserved");
  expect(evalScript("reserve", "brief-a")).toBe("denied");
  expect(evalScript("dispatch", "brief-a")).toBe("reserved");
  expect(evalScript("dispatch", "brief-a")).toBe("denied");
  const result = JSON.parse(redis("GET", key)) as Ledger;
  expect(result.authority.costCeilingVerified).toBe(false);
  expect(Object.values(result.reservations)).toHaveLength(1);
  expect(Object.values(result.reservations)[0]).toMatchObject({ reservedMicros: 1_000_000, dispatched: true });
  expect(redis("PTTL", key)).toBe("-1");
});

test("real local Lua: explicit single-image risk authority", async () => {
  await test.step("require an existing disposable local runtime; never install or start one", () => {
    const configured = process.env.NOVORA_BETA_LOCAL_REDIS_TEST_PORT;
    if (!configured || !/^\d{1,5}$/.test(configured) || Number(configured) < 1 || Number(configured) > 65535) {
      throw new Error("BLOCKED: an existing disposable local Redis fixture runtime is required; set NOVORA_BETA_LOCAL_REDIS_TEST_PORT. This suite never installs or starts infrastructure.");
    }
    port = configured;
    expect(redis("PING")).toBe("PONG");
  });
  await test.step("explicit risk acceptance reserves USD 1 while hard-cap proof stays false", () => {
    const f = fixture();
    expect(run(f)).toBe("reserved");
    const ledger = read(f);
    expect(ledger.authority.costCeilingVerified).toBe(false);
    expect(Object.values(ledger.reservations)).toEqual([expect.objectContaining({
      identity: IDENTITY, reservedMicros: 1_000_000, dispatched: false,
      pilotAuthorityId: f.authorityId, pilotExpiresAt: f.expiresAt, pilotExpectedCostMicros: 100_000,
    })]);
    expect(redis("PTTL", f.key)).toBe("-1");
  });

  await test.step("missing approval, false durability, fabricated proof and malformed limits deny without a write", () => {
    for (const patch of [
      { ownerApproved: false }, { ownerCostRiskAccepted: false }, { ownerCostRiskAccepted: null },
      { durabilityVerified: false }, { costCeilingVerified: true }, { costCeilingVerified: null },
      { maximumExperiences: 2 }, { maximumImages: 2 }, { maximumPaidAttempts: 2 },
      { automaticPaidRetries: true }, { automaticPaidRetries: null }, { limitMicros: 999_999 },
      { attemptReservationMicros: 999_999 }, { expectedCostMicros: 1_000_000 },
      { expectedCostMicros: 0 }, { expectedCostMicros: "100000" },
      { experienceCeilingMicros: 1_000_000 }, { costAuthorityMode: "unknown" }, { unexpectedApproval: true },
    ]) {
      const f = fixture(patch);
      const before = redis("GET", f.key);
      expect(run(f), JSON.stringify(patch)).toBe("denied");
      expect(redis("GET", f.key)).toBe(before);
    }
    for (const field of Object.keys(pilot(1, "synthetic"))) {
      const f = fixture();
      const ledger = read(f);
      delete ledger.authority[field];
      write(f, ledger);
      expect(run(f), `missing ${field}`).toBe("denied");
    }
  });

  await test.step("one exact invited identity is required for both reservation and dispatch", () => {
    for (const roster of ["||", "|other|", `|${IDENTITY}|other|`]) {
      const f = fixture();
      expect(run(f, "reserve", "request", "synthetic-brief", IDENTITY, roster)).toBe("denied");
    }
    const f = fixture();
    expect(run(f, "reserve", "request", "synthetic-brief", "other")).toBe("denied");
    expect(run(f)).toBe("reserved");
    expect(run(f, "dispatch", "request", "synthetic-brief", "", `|${IDENTITY}|other|`)).toBe("denied");
    expect(run(f, "dispatch")).toBe("reserved");
  });

  await test.step("every second reservation, replay, new key and new day is denied permanently", () => {
    const f = fixture();
    expect(run(f)).toBe("reserved");
    const before = redis("GET", f.key);
    expect(run(f)).toBe("denied");
    expect(run(f, "reserve", "another-key", "another-brief")).toBe("denied");
    expect(redis("GET", f.key)).toBe(before);
    const ledger = read(f);
    Object.values(ledger.reservations)[0].day = Number(Object.values(ledger.reservations)[0].day) - 1;
    write(f, ledger);
    expect(run(f, "reserve", "next-day", "next-day-brief")).toBe("denied");
    expect(Object.keys(read(f).reservations)).toHaveLength(1);
  });

  await test.step("at most one exact dispatch claim survives fresh connections and uncertain response", () => {
    const f = fixture();
    expect(run(f)).toBe("reserved");
    expect(run(f, "dispatch", "request", "wrong-brief")).toBe("denied");
    expect(run(f, "dispatch", "request", "synthetic-brief", IDENTITY, `|${IDENTITY}|`, "wrong-input")).toBe("denied");
    // Ignore the first successful response to model an uncertain caller outcome.
    run(f, "dispatch");
    expect(run(f, "dispatch")).toBe("denied");
    expect(Object.values(read(f).reservations)[0].dispatched).toBe(true);
    expect(run(f, "reserve", "retry", "retry-brief")).toBe("denied");
  });

  await test.step("expired or missing expiry and expiring ledger reject reserve and dispatch", () => {
    const f = fixture({ expiresAt: 1 });
    expect(run(f)).toBe("denied");
    const missing = fixture({ expiresAt: null });
    expect(run(missing)).toBe("denied");
    const expiring = fixture();
    expect(redis("EXPIRE", expiring.key, "3600")).toBe("1");
    expect(run(expiring)).toBe("denied");
    const consumed = fixture();
    expect(run(consumed)).toBe("reserved");
    const ledger = read(consumed);
    ledger.authority.expiresAt = 1;
    write(consumed, ledger);
    expect(run(consumed, "dispatch")).toBe("denied");
  });

  await test.step("authority replacement, extension, estimate change, downgrade and malformed records deny", () => {
    for (const field of ["id", "expiresAt", "expectedCostMicros", "downgrade", "record"]) {
      const f = fixture();
      expect(run(f)).toBe("reserved");
      const ledger = read(f);
      if (field === "id") { f.authorityId = "synthetic_replacement"; ledger.authority.id = f.authorityId; }
      if (field === "expiresAt") ledger.authority.expiresAt = f.expiresAt + 10;
      if (field === "expectedCostMicros") ledger.authority.expectedCostMicros = 150_000;
      if (field === "record") delete Object.values(ledger.reservations)[0].pilotAuthorityId;
      if (field === "downgrade") ledger.authority = verified(f);
      write(f, ledger);
      expect(run(f, "dispatch"), field).toBe("denied");
      expect(run(f, "reserve", "replacement", "replacement-brief"), field).toBe("denied");
    }
  });

  await test.step("concurrent different requests atomically admit one experience and one dispatch", async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 16 }, (_, i) => redisAsync(command(f, "reserve", `race-${i}`, `brief-${i}`))));
    expect(results.filter(value => value === "reserved")).toHaveLength(1);
    expect(results.filter(value => value === "denied")).toHaveLength(15);
    const reservations = Object.values(read(f).reservations);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].reservedMicros).toBe(1_000_000);
    const claims = await Promise.all(Array.from({ length: 16 }, () => redisAsync(command(f, "dispatch", "unused", String(reservations[0].briefId)))));
    expect(claims.filter(value => value === "reserved")).toHaveLength(1);
    expect(claims.filter(value => value === "denied")).toHaveLength(15);
  });

  await test.step("concurrent identical idempotency requests consume one reservation", async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 16 }, () => redisAsync(command(f))));
    expect(results.filter(value => value === "reserved")).toHaveLength(1);
    expect(results.filter(value => value === "denied")).toHaveLength(15);
    expect(Object.keys(read(f).reservations)).toHaveLength(1);
  });

  await test.step("original verified-cost mode preserves duplicate handling and atomic shared budget", async () => {
    const f = fixture();
    const ledger = read(f);
    ledger.authority = verified(f);
    ledger.authority.limitMicros = 400_000;
    write(f, ledger);
    expect(run(f)).toBe("reserved");
    expect(run(f)).toBe("duplicate");
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => redisAsync(command(f, "reserve", `verified-${i}`, `verified-brief-${i}`))));
    expect(results.filter(value => value === "reserved")).toHaveLength(1);
    expect(Object.values(read(f).reservations).reduce((sum, r) => sum + Number(r.reservedMicros), 0)).toBe(400_000);
    expect(run(f, "dispatch")).toBe("reserved");
    expect(run(f, "dispatch")).toBe("denied");
    const mixed = fixture({ costAuthorityMode: null, costCeilingVerified: true, experienceCeilingMicros: 200_000 });
    expect(run(mixed)).toBe("denied");
  });
});

function verified(f: Fixture): Authority {
  return { id: f.authorityId, ownerApproved: true, durabilityVerified: true,
    costCeilingVerified: true, currency: "USD", pricingVersion: modules.cost.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    limitMicros: 1_000_000, experienceCeilingMicros: 200_000, expiresAt: f.expiresAt };
}
