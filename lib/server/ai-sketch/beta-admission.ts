import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import {
  FIRST_PREVIEW_COST_CONTRACT,
  FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
} from "./first-preview-cost-contract";

export const BETA_ADMISSION_ENABLED_ENV = "NOVORA_BETA_ADMISSION_ENABLED";
export const BETA_INVITATIONS_ENV = "NOVORA_BETA_INVITATIONS_JSON";
export const BETA_SPENDING_AUTHORITY_ENV = "NOVORA_BETA_SPENDING_AUTHORITY_ID";
export const BETA_LEDGER_KEY = "novora:beta-admission:v1";
export const M2_PREVIEW_LEDGER_PREFIX = "novora:beta-admission:m2-e2e:v1:";
export const M2_PREVIEW_TOTAL_LIMIT_MICROS = 1_000_000;
export const BETA_DAILY_LIMIT = 5;
export const BETA_IDENTITY_LIMIT = 10;

type Environment = Readonly<Record<string, string | undefined>>;
type Invitation = Readonly<{ identity: string; credentialSha256: string }>;
export type BetaReservation = Readonly<{
  identity: string;
  requestKey: string;
  briefId: string;
  fingerprint: string;
}>;
export type BetaDispatch = Readonly<{
  briefId: string;
  fingerprint: string;
}>;

// Implementations must make quota, spending and idempotency ONE durable atomic
// operation. A local Map is a test fake, never a production implementation.
export type BetaAdmissionLedger = Readonly<{
  reserve(input: BetaReservation): Promise<"reserved" | "duplicate" | "denied">;
  claimDispatch(input: BetaDispatch): Promise<boolean>;
}>;
export type BetaAdmissionDependencies = Readonly<{
  environment?: Environment;
  ledger?: BetaAdmissionLedger;
}>;

export function betaAdmissionMode(environment: Environment = process.env) {
  const value = environment[BETA_ADMISSION_ENABLED_ENV];
  if (value === undefined || value === "false") return "disabled";
  return value === "true" ? "enabled" : "invalid";
}

const IDENTITY = /^[a-zA-Z0-9_-]{1,64}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function invitations(environment: Environment): Invitation[] | null {
  try {
    const raw = environment[BETA_INVITATIONS_ENV];
    if (!raw || raw.length > 4096) return null;
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length < 1 || values.length > BETA_IDENTITY_LIMIT) {
      return null;
    }
    const identities = new Set<string>();
    const hashes = new Set<string>();
    for (const value of values) {
      if (
        !value || typeof value !== "object" ||
        Object.keys(value).sort().join(",") !== "credentialSha256,identity" ||
        typeof value.identity !== "string" || !IDENTITY.test(value.identity) ||
        typeof value.credentialSha256 !== "string" || !SHA256.test(value.credentialSha256) ||
        identities.has(value.identity) || hashes.has(value.credentialSha256)
      ) return null;
      identities.add(value.identity);
      hashes.add(value.credentialSha256);
    }
    return values as Invitation[];
  } catch {
    return null;
  }
}

function authenticateInvitation(request: Request, environment: Environment): string | null {
  const roster = invitations(environment);
  const header = request.headers.get("authorization");
  // Credentials are independently provisioned high-entropy bearer secrets,
  // never email, Brief proofs, account IDs, URL parameters or browser storage.
  if (!roster || !header || !/^Bearer [A-Za-z0-9_-]{43,128}$/.test(header)) return null;
  const hash = createHash("sha256").update(header.slice(7)).digest();
  let identity: string | null = null;
  for (const invitation of roster) {
    if (timingSafeEqual(hash, Buffer.from(invitation.credentialSha256, "hex"))) {
      identity = invitation.identity;
    }
  }
  return identity;
}

export async function reserveBetaAdmission(
  input: BetaDispatch & { request?: Request },
  dependencies: BetaAdmissionDependencies = {},
): Promise<"legacy" | "reserved" | "denied"> {
  const environment = dependencies.environment ?? process.env;
  const mode = betaAdmissionMode(environment);
  if (mode === "disabled") return "legacy";
  if (mode !== "enabled" || !input.request) return "denied";
  try {
    const identity = authenticateInvitation(input.request, environment);
    const key = input.request.headers.get("idempotency-key");
    if (!identity || !key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return "denied";
    const ledger = dependencies.ledger ?? createRedisBetaAdmissionLedger(environment);
    if (!ledger) return "denied";
    const result = await ledger.reserve({
      identity,
      requestKey: createHash("sha256").update(`${identity}\n${key}`).digest("hex"),
      briefId: input.briefId,
      fingerprint: input.fingerprint,
    });
    // A duplicate never publishes again, including uncertain prior publication.
    return result === "reserved" ? "reserved" : "denied";
  } catch {
    return "denied";
  }
}

export async function claimBetaDispatch(
  input: BetaDispatch & { betaAdmission?: true },
  dependencies: BetaAdmissionDependencies = {},
): Promise<boolean> {
  const environment = dependencies.environment ?? process.env;
  const mode = betaAdmissionMode(environment);
  if (mode === "disabled" && input.betaAdmission !== true) return true;
  // Marked work cannot become legacy work when Beta is subsequently disabled.
  if (mode !== "enabled" || input.betaAdmission !== true) return false;
  try {
    if (!invitations(environment)) return false;
    const ledger = dependencies.ledger ?? createRedisBetaAdmissionLedger(environment);
    return ledger ? await ledger.claimDispatch(input) === true : false;
  } catch {
    return false;
  }
}

// No authority or ledger is created here. Provisioning, approval, durability,
// current pricing and either verified cost coverage or explicit one-image
// Owner cost-risk acceptance require a separately approved release gate.
// One permanent key, no TTL/refund/reset, and one SET after all validation:
// Redis script errors cannot leave a partly updated quota/spending transaction.
export const BETA_ADMISSION_SCRIPT = `
local function integer(n)
  return type(n) == 'number' and n >= 0 and n <= 9007199254740991 and n == math.floor(n)
end
local raw = redis.call('GET', KEYS[1])
if not raw or string.len(raw) > 4000000 or redis.call('PTTL', KEYS[1]) ~= -1 then return 'denied' end
local ok, ledger = pcall(cjson.decode, raw)
if not ok or type(ledger) ~= 'table' then return 'denied' end
local a = ledger.authority
local now = tonumber(redis.call('TIME')[1])
if type(a) ~= 'table' or ledger.version ~= 1 or a.id ~= ARGV[2] or
   a.ownerApproved ~= true or a.durabilityVerified ~= true or
   a.currency ~= 'USD' or a.pricingVersion ~= ARGV[3] or
   not integer(a.limitMicros) or a.limitMicros < 1 or
   not integer(a.expiresAt) or a.expiresAt <= now or
   type(ledger.reservations) ~= 'table' then return 'denied' end
local pilot = a.costAuthorityMode == 'owner_expected_cost_single_attempt_v1'
local reservationMicros = a.experienceCeilingMicros
if pilot then
  local fields = {id=true, ownerApproved=true, durabilityVerified=true, currency=true,
    pricingVersion=true, limitMicros=true, expiresAt=true, costAuthorityMode=true,
    ownerCostRiskAccepted=true, costCeilingVerified=true, maximumExperiences=true,
    maximumImages=true, maximumPaidAttempts=true, automaticPaidRetries=true,
    attemptReservationMicros=true, expectedCostMicros=true, invitedIdentity=true}
  if ARGV[10] then fields.runtimeBinding = true end
  for field, _ in pairs(a) do if not fields[field] then return 'denied' end end
  if a.ownerCostRiskAccepted ~= true or a.costCeilingVerified ~= false or
     a.maximumExperiences ~= 1 or a.maximumImages ~= 1 or a.maximumPaidAttempts ~= 1 or
     a.automaticPaidRetries ~= false or a.limitMicros ~= 1000000 or
     a.attemptReservationMicros ~= 1000000 or a.experienceCeilingMicros ~= nil or
     not integer(a.expectedCostMicros) or a.expectedCostMicros < 1 or a.expectedCostMicros >= 1000000 or
     type(a.invitedIdentity) ~= 'string' or string.len(a.invitedIdentity) < 1 or
     string.len(a.invitedIdentity) > 64 or not string.match(a.invitedIdentity, '^[%w_-]+$') or
     ARGV[9] ~= '|' .. a.invitedIdentity .. '|' then return 'denied' end
  reservationMicros = a.attemptReservationMicros
else
  if a.costAuthorityMode ~= nil or a.costCeilingVerified ~= true or
     not integer(reservationMicros) or reservationMicros < tonumber(ARGV[4]) then return 'denied' end
  for _, field in ipairs({'ownerCostRiskAccepted', 'maximumExperiences', 'maximumImages',
      'maximumPaidAttempts', 'automaticPaidRetries', 'attemptReservationMicros',
      'expectedCostMicros', 'invitedIdentity'}) do
    if a[field] ~= nil then return 'denied' end
  end
end
local day = math.floor(now / 86400)
local total, count, size = 0, 0, 0
local duplicate, dispatch = nil, nil
local keys, briefs = {}, {}
for k, r in pairs(ledger.reservations) do
  size = size + 1
  if size > 10000 or type(k) ~= 'string' or type(r) ~= 'table' or
     type(r.identity) ~= 'string' or type(r.briefId) ~= 'string' or
     type(r.fingerprint) ~= 'string' or type(r.requestKey) ~= 'string' or
     type(r.dispatched) ~= 'boolean' or not integer(r.day) or
     r.day > day or not integer(r.reservedMicros) or r.reservedMicros < 1 or
     k ~= r.requestKey or keys[r.requestKey] or briefs[r.briefId] then return 'denied' end
  if pilot then
    if size > 1 or r.identity ~= a.invitedIdentity or r.reservedMicros ~= reservationMicros or
       r.pilotAuthorityId ~= a.id or r.pilotExpiresAt ~= a.expiresAt or
       r.pilotExpectedCostMicros ~= a.expectedCostMicros then return 'denied' end
  elseif r.pilotAuthorityId ~= nil or r.pilotExpiresAt ~= nil or
         r.pilotExpectedCostMicros ~= nil then return 'denied' end
  keys[r.requestKey], briefs[r.briefId] = true, true
  total = total + r.reservedMicros
  if not integer(total) then return 'denied' end
  if r.identity == ARGV[5] and r.day == day then count = count + 1 end
  if r.requestKey == ARGV[6] then duplicate = r end
  if r.briefId == ARGV[7] then dispatch = r end
end
if total > a.limitMicros then return 'denied' end
if ARGV[1] == 'reserve' then
  if pilot and (size ~= 0 or ARGV[5] ~= a.invitedIdentity) then return 'denied' end
  if duplicate then
    if duplicate.identity == ARGV[5] and duplicate.fingerprint == ARGV[8] then return 'duplicate' end
    return 'denied'
  end
  if dispatch or count >= 5 or size >= 10000 or
     not integer(total + reservationMicros) or
     total + reservationMicros > a.limitMicros then return 'denied' end
  ledger.reservations[ARGV[6]] = {
    identity = ARGV[5], requestKey = ARGV[6], briefId = ARGV[7], fingerprint = ARGV[8],
    day = day, reservedMicros = reservationMicros, dispatched = false
  }
  if pilot then
    local r = ledger.reservations[ARGV[6]]
    r.pilotAuthorityId, r.pilotExpiresAt, r.pilotExpectedCostMicros = a.id, a.expiresAt, a.expectedCostMicros
  end
elseif ARGV[1] == 'dispatch' then
  if not dispatch or dispatch.fingerprint ~= ARGV[8] or dispatch.dispatched or
     not string.find(ARGV[9], '|' .. dispatch.identity .. '|', 1, true) then return 'denied' end
  dispatch.dispatched = true
else return 'denied' end
redis.call('SET', KEYS[1], cjson.encode(ledger))
return 'reserved'
`;

export type BetaAdmissionBinding = Readonly<{
  ledgerKey: string;
  authorityId: string;
  runtimeBinding: string | null;
}>;

export type BetaBindingDiagnostics = Readonly<{
  deploymentIdValid: boolean;
  sourceShaValid: boolean;
  authorityValid: boolean;
  invitationValid: boolean;
  targetValid: boolean;
}>;

export function isPreviewTarget(target: string | undefined): boolean {
  return target === undefined || target === "preview";
}

// Server metadata selects a deployment-specific namespace. This never creates
// authority, verifies a billing ceiling, or enables any runtime feature flag.
export function inspectBetaAdmissionBinding(environment: Environment): Readonly<{
  binding: BetaAdmissionBinding | null;
  diagnostics: BetaBindingDiagnostics;
}> {
  const authorityId = environment[BETA_SPENDING_AUTHORITY_ENV];
  const target = environment.VERCEL_TARGET_ENV;
  const roster = invitations(environment);
  // Next replaces direct NEXT_RUNTIME reads at compile time. It does not
  // populate the dynamic process.env object with that value. Use the compiled
  // runtime only for the actual process environment; injected environments
  // must continue to provide their own explicit runtime.
  const runtime = environment === process.env ? process.env.NEXT_RUNTIME : environment.NEXT_RUNTIME;
  const runtimeConsistent = environment !== process.env || environment.NEXT_RUNTIME === undefined || environment.NEXT_RUNTIME === runtime;
  const diagnostics: BetaBindingDiagnostics = {
    deploymentIdValid: /^dpl_[A-Za-z0-9]{16,80}$/.test(environment.VERCEL_DEPLOYMENT_ID ?? ""),
    sourceShaValid: /^[a-f0-9]{40}$/.test(environment.VERCEL_GIT_COMMIT_SHA ?? ""),
    authorityValid: Boolean(authorityId && IDENTITY.test(authorityId)),
    invitationValid: Boolean(roster && roster.length === 1),
    targetValid: isPreviewTarget(target),
  };
  if (!diagnostics.authorityValid || !authorityId) return { binding: null, diagnostics };
  const hosted = environment.VERCEL !== undefined || environment.VERCEL_ENV !== undefined || target !== undefined;
  if ((!hosted && environment.NODE_ENV !== "production") ||
    (environment.VERCEL_ENV === "production" && (!target || target === "production"))) {
    return { binding: { ledgerKey: BETA_LEDGER_KEY, authorityId, runtimeBinding: null }, diagnostics };
  }
  if (environment.VERCEL !== "1" || environment.VERCEL_ENV !== "preview" ||
    !diagnostics.targetValid || environment.NODE_ENV !== "production" ||
    runtime !== "nodejs" || !runtimeConsistent || environment.NEXT_PHASE === "phase-production-build" ||
    environment.VERCEL_PROJECT_ID !== "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg" ||
    environment.VERCEL_GIT_COMMIT_REF !== "integration/instant-first-preview-agent" ||
    !diagnostics.sourceShaValid || !diagnostics.deploymentIdValid ||
    environment.NOVORA_BETA_ADMISSION_ENABLED !== "true" ||
    environment.NOVORA_INSTANT_PREVIEW_AGENT_ENABLED !== "true" ||
    environment.NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED !== "true" ||
    !diagnostics.invitationValid || !roster) return { binding: null, diagnostics };
  const runtimeBinding = createHash("sha256").update([
    "novora_m2_e2e_preview_v1", environment.VERCEL_PROJECT_ID,
    environment.VERCEL_GIT_COMMIT_REF, environment.VERCEL_GIT_COMMIT_SHA,
    environment.VERCEL_DEPLOYMENT_ID, authorityId, roster[0].identity, roster[0].credentialSha256,
  ].join("\n")).digest("hex");
  return { binding: {
    ledgerKey: M2_PREVIEW_LEDGER_PREFIX + runtimeBinding,
    authorityId: "m2e2e_" + runtimeBinding.slice(0, 56),
    runtimeBinding,
  }, diagnostics };
}

// An isolated receipt is authorized only by the same verified invitation and
// exact protected Preview binding used by admission. The request ID is never
// authentication, and ordinary anonymous submissions do not use this path.
export function authenticateM2ReceiptRequest(request: Request, environment: Environment = process.env): Readonly<{ identity: string; scope: string }> | null {
  if (betaAdmissionMode(environment) !== "enabled") return null;
  const binding = inspectBetaAdmissionBinding(environment).binding;
  if (!binding?.runtimeBinding) return null;
  const identity = authenticateInvitation(request, environment);
  return identity ? { identity, scope: binding.runtimeBinding } : null;
}

export function resolveBetaAdmissionBinding(environment: Environment): BetaAdmissionBinding | null {
  return inspectBetaAdmissionBinding(environment).binding;
}

// These extra checks execute INSIDE the same atomic EVAL, before the unchanged
// reservation/dispatch script. No GET-then-SET race or risk-mode fallback.
// A complete USD 1 experience remains consumed after failure or uncertainty.
export const M2_PREVIEW_ADMISSION_SCRIPT = `
if type(ARGV[10]) ~= 'string' or string.len(ARGV[10]) ~= 64 or
   not string.match(ARGV[10], '^[a-f0-9]+$') or
   KEYS[1] ~= 'novora:beta-admission:m2-e2e:v1:' .. ARGV[10] then return 'denied' end
local scopedRaw = redis.call('GET', KEYS[1])
if not scopedRaw or string.len(scopedRaw) > 4000000 then return 'denied' end
local scopedOk, scoped = pcall(cjson.decode, scopedRaw)
if not scopedOk or type(scoped) ~= 'table' or type(scoped.authority) ~= 'table' then return 'denied' end
local scopedAuthority = scoped.authority
local allowed = {id=true, ownerApproved=true, durabilityVerified=true, currency=true,
  pricingVersion=true, limitMicros=true, expiresAt=true, costCeilingVerified=true,
  experienceCeilingMicros=true, runtimeBinding=true, costAuthorityMode=true,
  ownerCostRiskAccepted=true, maximumExperiences=true, maximumImages=true,
  maximumPaidAttempts=true, automaticPaidRetries=true, attemptReservationMicros=true,
  expectedCostMicros=true, invitedIdentity=true}
for field, _ in pairs(scopedAuthority) do if not allowed[field] then return 'denied' end end
local scopedPilot = scopedAuthority.costAuthorityMode == 'owner_expected_cost_single_attempt_v1'
if scopedAuthority.runtimeBinding ~= ARGV[10] or scopedAuthority.limitMicros ~= 1000000 or
   (scopedPilot and (scopedAuthority.costCeilingVerified ~= false or scopedAuthority.attemptReservationMicros ~= 1000000)) or
   (not scopedPilot and (scopedAuthority.costCeilingVerified ~= true or scopedAuthority.experienceCeilingMicros ~= 1000000)) or
   type(scopedAuthority.expiresAt) ~= 'number' or
   scopedAuthority.expiresAt > tonumber(redis.call('TIME')[1]) + 3600 then return 'denied' end
` + BETA_ADMISSION_SCRIPT;

export function createRedisBetaAdmissionLedger(
  environment: Environment = process.env,
  fetchImplementation: typeof fetch = fetch,
): BetaAdmissionLedger | null {
  const binding = resolveBetaAdmissionBinding(environment);
  const roster = invitations(environment);
  const url = environment.UPSTASH_REDIS_REST_URL ?? environment.KV_REST_API_URL;
  const credential = environment.UPSTASH_REDIS_REST_URL
    ? environment.UPSTASH_REDIS_REST_TOKEN
    : environment.KV_REST_API_TOKEN;
  if (!roster || !binding || !url || !credential) return null;
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      return null;
    }
  } catch { return null; }
  async function execute(operation: "reserve" | "dispatch", input: BetaDispatch & Partial<BetaReservation>) {
    const response = await fetchImplementation(url!, {
      method: "POST",
      headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        "EVAL", binding.runtimeBinding ? M2_PREVIEW_ADMISSION_SCRIPT : BETA_ADMISSION_SCRIPT, "1", binding.ledgerKey,
        operation, binding.authorityId, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
        String(FIRST_PREVIEW_COST_CONTRACT.lifetimeBudgetPerConceptBriefMicros),
        input.identity ?? "", input.requestKey ?? "", input.briefId, input.fingerprint,
        `|${roster!.map(value => value.identity).join("|")}|`,
        ...(binding.runtimeBinding ? [binding.runtimeBinding] : []),
      ]),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) return "denied";
    const text = await response.text();
    if (text.length > 256) return "denied";
    const body = JSON.parse(text);
    if (body.error || !["reserved", "duplicate", "denied"].includes(body.result)) return "denied";
    return body.result as "reserved" | "duplicate" | "denied";
  }
  return {
    reserve: (input) => execute("reserve", input),
    claimDispatch: async (input) => await execute("dispatch", input) === "reserved",
  };
}
