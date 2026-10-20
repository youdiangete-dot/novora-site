import "server-only";

import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readCurrentConceptBriefRateAuthority } from "../public-api-rate-limit";
import {
  isInitiationIntent, isDispatchGrant, isUuid,
  type InitiationIntent, type PrivateDispatchGrant, type PrivateAdmissionContext,
} from "./first-preview-initiation-contract";
import {
  FIRST_PREVIEW_COST_CONTRACT,
  FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
} from "./first-preview-cost-contract";
import { deriveFirstPreviewIdempotencyKey } from "./first-preview-persistence-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import type { FirstPreviewGenerationWork } from "./first-preview-generation-lifecycle";

// Owner-approved O1 engineering policy. This is one pool across all identities,
// not an IP/email limiter or a customer entitlement. No live activation here.
export const FIRST_PREVIEW_PAID_ADMISSION_POLICY = {
  version: "novora-paid-generation-o1-20261012-v1",
  budget24HoursMicros: 25_000_000,
  budget30DaysMicros: 750_000_000,
  maximumConcurrentOperations: 2,
  maximumGenerationDispatches24Hours: 180,
} as const;

export const FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY =
  "novora:{paid-generation}:o1:v1";

// Redis TIME and GET produce a consistent shared snapshot. The CAS commits
// the entire decision atomically across instances; a loser denies, never retries.
export const PAID_ADMISSION_READ_SCRIPT = `
local t = redis.call('TIME')
if redis.call('PTTL', KEYS[1]) ~= -1 then return {'', t[1], t[2]} end
return {redis.call('GET', KEYS[1]) or '', t[1], t[2]}
`;
export const PAID_ADMISSION_COMMIT_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
local value = cjson.decode(ARGV[2])
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
if now < value.clockMs then return 0 end
value.clockMs = now
if ARGV[3] ~= '' then value.entries[ARGV[3]].closedAtMs = now end
redis.call('SET', KEYS[1], cjson.encode(value))
return 1
`;

// Read/CAS preparation is not permission. This THREE-key EVAL is the sole
// combined authorization/commit. No write occurs before every check succeeds.
// Cross-slot/provider errors deny; there is no independent-command fallback.
export const PAID_ADMISSION_COMBINED_COMMIT_SCRIPT = `
if #KEYS ~= 3 or #ARGV ~= 4 then return 0 end
if KEYS[1] == KEYS[2] or KEYS[1] == KEYS[3] or KEYS[2] == KEYS[3] then return 0 end
if redis.call('PTTL', KEYS[1]) ~= -1 or redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
local value = cjson.decode(ARGV[1])
local a = cjson.decode(ARGV[2])
local g = cjson.decode(ARGV[3])
local p = cjson.decode(ARGV[4])
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
if now < value.clockMs or value.policyVersion ~= p.o1.version then return 0 end
if a.state ~= 'dispatch_armed' or a.owner ~= a.lease_owner or a.owner == '' then return 0 end
if g.version ~= a.version or g.concept_brief_id ~= a.concept_brief_id or
   g.job_id ~= a.job_id or g.identity_key ~= a.identity_key or g.fence ~= a.fence or
   g.nonce ~= a.nonce or g.deadline_ms ~= a.deadline_ms or
   g.admission_context_digest ~= a.context_digest then return 0 end
if type(g.deadline_ms) ~= 'number' or g.deadline_ms ~= math.floor(g.deadline_ms) or
   g.deadline_ms > 9007199254740991 or now >= g.deadline_ms or now >= a.lease_until_ms then return 0 end
if a.key_version ~= p.key_version or a.rate_policy_version ~= p.rate_policy_version or
   KEYS[2] ~= a.ip_key or KEYS[3] ~= a.email_key then return 0 end
local function admitted(key, policy)
  local raw = redis.call('GET', key)
  local ttl = redis.call('PTTL', key)
  if not raw or not string.match(raw, '^%d+$') then return false end
  local count = tonumber(raw)
  return count and count >= 1 and count == math.floor(count) and count <= policy.limit and
    ttl > 0 and ttl <= policy.windowSeconds * 1000
end
if not admitted(KEYS[2], p.ip) or not admitted(KEYS[3], p.email) then return 0 end
local entry = value.entries[a.identity_key]
if not entry or entry.status ~= 'reserved' or entry.ownerJobId ~= cjson.null or
   entry.closedAtMs ~= cjson.null or entry.fingerprint ~= a.fingerprint then return 0 end
local daily, monthly, dispatches, active = 0, 0, 0, 0
for _, item in pairs(value.entries) do
  if item.closedAtMs == cjson.null or item.closedAtMs > now - 86400000 then
    daily = daily + item.chargeMicros
    dispatches = dispatches + 1
  end
  if item.closedAtMs == cjson.null or item.closedAtMs > now - 2592000000 then
    monthly = monthly + item.chargeMicros
  end
  if item.status ~= 'settled' then active = active + 1 end
end
if daily > p.o1.budget24HoursMicros or monthly > p.o1.budget30DaysMicros or
   dispatches > p.o1.maximumGenerationDispatches24Hours or active > p.o1.maximumConcurrentOperations then return 0 end
entry.status = 'dispatched'
entry.ownerJobId = a.job_id
value.clockMs = now
redis.call('SET', KEYS[1], cjson.encode(value))
return 1
`;

export type CombinedDispatchAuthority = Readonly<{
  // Only the authenticated Worker may supply its authoritative claimed snapshot.
  // These are not request/Queue fields and this type authenticates no principal.
  intent: InitiationIntent;
  owner: string;
  grant: PrivateDispatchGrant;
}>;

// Binding digest only; never a credential, signature or proof verification.
export function deriveFirstPreviewAdmissionContextDigest(context: PrivateAdmissionContext): string {
  return createHash("sha256").update(JSON.stringify([
    "NOVORA:first-preview:dispatch-context:v1", context.version,
    context.ip_key, context.email_key, context.key_version, context.rate_policy_version,
    context.access_binding.concept_brief_id, context.access_binding.public_reference,
    context.access_binding.proof_version, context.access_binding.binding_digest,
  ]), "utf8").digest("hex");
}

export type PaidAdmissionSubject = Readonly<{ identity: string; fingerprint: string }>;
export type FirstPreviewPaidAdmission = Readonly<{
  reserve(subject: PaidAdmissionSubject): Promise<boolean>;
  dispatch(subject: PaidAdmissionSubject, jobId: string): Promise<boolean>;
  dispatchCombined?(subject: PaidAdmissionSubject, jobId: string,
    authority: CombinedDispatchAuthority): Promise<boolean>;
  settle(subject: PaidAdmissionSubject, jobId: string, input: {
    actualCostMicros: number;
    operationCompleted: boolean;
  }): Promise<boolean>;
}>;

type Entry = {
  fingerprint: string;
  status: "reserved" | "dispatched" | "settled";
  ownerJobId: string | null;
  chargeMicros: number;
  closedAtMs: number | null;
  attribution: "unclassified";
};
type Ledger = {
  policyVersion: string;
  clockMs: number;
  entries: Record<string, Entry>;
};
const DAY_MS = 24 * 60 * 60 * 1000;
const HASH = /^[a-f0-9]{64}$/;
const RESERVATION = FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros;

export function createPaidAdmissionSubject(
  work: Pick<FirstPreviewGenerationWork,
    "conceptBriefId" | "publicReference" | "attemptNumber" | "parentJobId" | "structured"
  >,
): PaidAdmissionSubject | null {
  if (!isValidFirstPreviewAssetUuid(work.conceptBriefId) ||
      !isValidFirstPreviewPublicReference(work.publicReference)) return null;
  const identity = deriveFirstPreviewIdempotencyKey({
    ...work,
    // Canonical identity excludes jobId. Reuse the valid brief UUID solely for
    // the existing identity validator, before the durable job has been created.
    jobId: work.conceptBriefId,
    sourceOutputId: null,
    estimatedCostMicros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros,
    costCurrency: FIRST_PREVIEW_COST_CONTRACT.currency,
    pricingAssumptionVersion: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    designSpecVersion: work.structured.designSpec.spec_version,
    designSpecSha256: work.structured.designSpecSha256,
    handSketchInstructionVersion: work.structured.handSketchInstruction.instruction_version,
    handSketchInstructionSha256: work.structured.handSketchInstructionSha256,
  });
  return identity ? {
    identity,
    fingerprint: createHash("sha256").update(JSON.stringify([
      identity, work.publicReference, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
    ])).digest("hex"),
  } : null;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function integer(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function readLedger(raw: string, now: number): Ledger | null {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || !exactKeys(value, ["policyVersion", "clockMs", "entries"]) ||
      value.policyVersion !== FIRST_PREVIEW_PAID_ADMISSION_POLICY.version ||
      !integer(value.clockMs) || value.clockMs > now || !record(value.entries)) return null;
  for (const [id, entry] of Object.entries(value.entries)) {
    if (!HASH.test(id) || !record(entry) ||
        !exactKeys(entry, ["fingerprint", "status", "ownerJobId", "chargeMicros", "closedAtMs", "attribution"]) ||
        typeof entry.fingerprint !== "string" || !HASH.test(entry.fingerprint) ||
        !integer(entry.chargeMicros) || entry.chargeMicros < RESERVATION ||
        entry.attribution !== "unclassified" ||
        typeof entry.status !== "string" ||
        !["reserved", "dispatched", "settled"].includes(entry.status)) return null;
    if (entry.status === "reserved") {
      if (entry.ownerJobId !== null || entry.closedAtMs !== null) return null;
    } else {
      if (typeof entry.ownerJobId !== "string" ||
          !isValidFirstPreviewAssetUuid(entry.ownerJobId)) return null;
      if (entry.status === "dispatched" && entry.closedAtMs !== null) return null;
      if (entry.status === "settled" &&
          (!integer(entry.closedAtMs) || entry.closedAtMs > now)) return null;
    }
  }
  return value as unknown as Ledger;
}

function withinLimits(ledger: Ledger, now: number): boolean {
  let dailyCost = 0, monthlyCost = 0, dailyDispatches = 0, active = 0;
  for (const entry of Object.values(ledger.entries)) {
    // Unsettled work never ages out: queued, failed, interrupted and unknown
    // billing retain both their full charge and concurrency slot conservatively.
    if (entry.closedAtMs === null || entry.closedAtMs > now - DAY_MS) {
      dailyCost += entry.chargeMicros;
      dailyDispatches += 1;
    }
    if (entry.closedAtMs === null || entry.closedAtMs > now - 30 * DAY_MS) {
      monthlyCost += entry.chargeMicros;
    }
    if (entry.status !== "settled") active += 1;
  }
  return dailyCost <= FIRST_PREVIEW_PAID_ADMISSION_POLICY.budget24HoursMicros &&
    monthlyCost <= FIRST_PREVIEW_PAID_ADMISSION_POLICY.budget30DaysMicros &&
    dailyDispatches <= FIRST_PREVIEW_PAID_ADMISSION_POLICY.maximumGenerationDispatches24Hours &&
    active <= FIRST_PREVIEW_PAID_ADMISSION_POLICY.maximumConcurrentOperations;
}

export function createFirstPreviewPaidAdmission(options: {
  environment?: Readonly<Record<string, string | undefined>>;
  fetchImplementation?: typeof fetch;
} = {}): FirstPreviewPaidAdmission {
  async function command(script: string, args: string[],
    keys = [FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY],
    environment = options.environment ?? process.env,
  ): Promise<unknown> {
    const families = [
      [environment.UPSTASH_REDIS_REST_URL, environment.UPSTASH_REDIS_REST_TOKEN],
      [environment.KV_REST_API_URL, environment.KV_REST_API_TOKEN],
    ].filter(([url, token]) => url || token);
    if (families.length !== 1 || !families[0][0] || !families[0][1]) throw new Error("unavailable");
    const [url, token] = families[0];
    const endpoint = new URL(url!);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash) throw new Error("unavailable");
    const response = await (options.fetchImplementation ?? fetch)(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, String(keys.length), ...keys, ...args]),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("unavailable");
    const body: unknown = await response.json();
    if (!record(body) || body.error || !Object.hasOwn(body, "result")) throw new Error("unavailable");
    return body.result;
  }
  async function dispatchCombined(subject: PaidAdmissionSubject, jobId: string,
    authority: CombinedDispatchAuthority): Promise<boolean> {
    try {
      // Snapshot only named configuration. No environment dump, raw PII or logging.
      const env = options.environment ?? process.env;
      const environment = {
        UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
        KV_REST_API_URL: env.KV_REST_API_URL, KV_REST_API_TOKEN: env.KV_REST_API_TOKEN,
        NOVORA_INTERNAL_SIGNING_SECRET: env.NOVORA_INTERNAL_SIGNING_SECRET,
      };
      const current = readCurrentConceptBriefRateAuthority(environment);
      const { intent, owner, grant } = structuredClone(authority);
      if (!current || !isInitiationIntent(intent) || intent.state !== "dispatch_armed" ||
          intent.handoff_stage !== "generation" || !isUuid(owner) || intent.lease_owner !== owner ||
          !intent.prepared || !intent.admission_context || !isDispatchGrant(grant, intent) ||
          !isDeepStrictEqual(intent.dispatch_grant, grant) || jobId !== grant.job_id) return false;
      const context = intent.admission_context;
      const expected = createPaidAdmissionSubject({
        conceptBriefId: intent.concept_brief_id, publicReference: context.access_binding.public_reference,
        attemptNumber: 1, parentJobId: null, structured: intent.prepared.generation_input,
      });
      const digest = deriveFirstPreviewAdmissionContextDigest(context);
      if (!expected || !isDeepStrictEqual(subject, expected) || subject.identity !== grant.identity_key ||
          context.key_version !== current.key_version || context.rate_policy_version !== current.rate_policy_version ||
          grant.admission_context_digest !== digest) return false;
      const leaseUntil = Date.parse(intent.lease_until!);
      if (!integer(leaseUntil)) return false;
      const snapshot = await command(PAID_ADMISSION_READ_SCRIPT, [], undefined, environment);
      if (!Array.isArray(snapshot) || snapshot.length !== 3 || typeof snapshot[0] !== "string" ||
          !/^\d+$/.test(String(snapshot[1])) || !/^\d+$/.test(String(snapshot[2]))) return false;
      const now = Number(snapshot[1]) * 1000 + Math.floor(Number(snapshot[2]) / 1000);
      if (!integer(now) || Number(snapshot[2]) >= 1_000_000) return false;
      const ledger = readLedger(snapshot[0], now);
      if (!ledger || !withinLimits(ledger, now)) return false;
      const entry = ledger.entries[subject.identity];
      if (!entry || entry.status !== "reserved" || entry.fingerprint !== subject.fingerprint) return false;
      // Reject in-process configuration/secret rotation during the read as well.
      if (Object.entries(environment).some(([key, value]) => env[key] !== value)) return false;
      const binding = {
        version: intent.version, concept_brief_id: intent.concept_brief_id,
        job_id: jobId, identity_key: subject.identity, fingerprint: subject.fingerprint,
        state: intent.state, owner, lease_owner: intent.lease_owner, fence: intent.fence,
        nonce: intent.dispatch_grant!.nonce, deadline_ms: intent.dispatch_grant!.deadline_ms,
        lease_until_ms: leaseUntil, context_digest: digest,
        ip_key: context.ip_key, email_key: context.email_key,
        key_version: context.key_version, rate_policy_version: context.rate_policy_version,
      };
      // Same endpoint/credential and one KEYS list. Provider inability or any
      // non-exact acknowledgement denies; never retry an uncertain commit.
      const committed = await command(PAID_ADMISSION_COMBINED_COMMIT_SCRIPT,
        [snapshot[0], JSON.stringify(binding), JSON.stringify(grant),
          JSON.stringify({ ...current, o1: FIRST_PREVIEW_PAID_ADMISSION_POLICY })],
        [FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY, context.ip_key, context.email_key], environment);
      return committed === 1 && Object.entries(environment).every(([key, value]) => env[key] === value);
    } catch { return false; }
  }

  async function transition(subject: PaidAdmissionSubject, action: "reserve" | "dispatch" | "settle",
    jobId?: string, settlement?: { actualCostMicros: number; operationCompleted: boolean },
  ): Promise<boolean> {
    try {
      if (!subject || !HASH.test(subject.identity) || !HASH.test(subject.fingerprint)) return false;
      if (action !== "reserve" && !isValidFirstPreviewAssetUuid(jobId)) return false;
      const snapshot = await command(PAID_ADMISSION_READ_SCRIPT, []);
      if (!Array.isArray(snapshot) || snapshot.length !== 3 || typeof snapshot[0] !== "string" ||
          !/^\d+$/.test(String(snapshot[1])) || !/^\d+$/.test(String(snapshot[2]))) return false;
      const now = Number(snapshot[1]) * 1000 + Math.floor(Number(snapshot[2]) / 1000);
      if (!integer(now) || Number(snapshot[2]) >= 1_000_000) return false;
      // No request-driven initialization: missing/evicted/reset state cannot
      // prove zero historic spending. Activation needs separately verified state.
      const raw = snapshot[0];
      const ledger = readLedger(raw, now);
      if (!ledger) return false;
      const existing = ledger.entries[subject.identity];
      if (existing && existing.fingerprint !== subject.fingerprint) return false;
      if (action === "reserve") {
        if (existing) return existing.status === "reserved" && withinLimits(ledger, now);
        ledger.entries[subject.identity] = {
          fingerprint: subject.fingerprint, status: "reserved", ownerJobId: null,
          chargeMicros: RESERVATION, closedAtMs: null, attribution: "unclassified",
        };
      } else if (action === "dispatch") {
        if (!existing || existing.status !== "reserved") return false;
        existing.status = "dispatched";
        existing.ownerJobId = jobId!;
      } else {
        if (!existing || existing.status !== "dispatched" || existing.ownerJobId !== jobId ||
            !settlement || !integer(settlement.actualCostMicros) ||
            typeof settlement.operationCompleted !== "boolean") return false;
        // Never refund a reservation on missing usage or a failed operation.
        existing.chargeMicros = Math.max(existing.chargeMicros, settlement.actualCostMicros);
        if (settlement.operationCompleted) existing.status = "settled";
      }
      if (action !== "settle" && !withinLimits(ledger, now)) return false;
      ledger.clockMs = now;
      return await command(PAID_ADMISSION_COMMIT_SCRIPT, [raw, JSON.stringify(ledger),
        action === "settle" && settlement?.operationCompleted ? subject.identity : "",
      ]) === 1;
    } catch {
      return false;
    }
  }
  return {
    reserve: (subject) => transition(subject, "reserve"),
    dispatch: (subject, jobId) => transition(subject, "dispatch", jobId),
    dispatchCombined,
    settle: (subject, jobId, input) => transition(subject, "settle", jobId, input),
  };
}
