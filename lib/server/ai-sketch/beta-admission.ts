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
// current pricing and the conservative complete-experience cost ceiling must
// be independently verified in a separately approved release gate.
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
   a.ownerApproved ~= true or a.costCeilingVerified ~= true or a.durabilityVerified ~= true or
   a.currency ~= 'USD' or a.pricingVersion ~= ARGV[3] or
   not integer(a.limitMicros) or a.limitMicros < 1 or
   not integer(a.experienceCeilingMicros) or a.experienceCeilingMicros < tonumber(ARGV[4]) or
   not integer(a.expiresAt) or a.expiresAt <= now or
   type(ledger.reservations) ~= 'table' then return 'denied' end
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
  keys[r.requestKey], briefs[r.briefId] = true, true
  total = total + r.reservedMicros
  if not integer(total) then return 'denied' end
  if r.identity == ARGV[5] and r.day == day then count = count + 1 end
  if r.requestKey == ARGV[6] then duplicate = r end
  if r.briefId == ARGV[7] then dispatch = r end
end
if total > a.limitMicros then return 'denied' end
if ARGV[1] == 'reserve' then
  if duplicate then
    if duplicate.identity == ARGV[5] and duplicate.fingerprint == ARGV[8] then return 'duplicate' end
    return 'denied'
  end
  if dispatch or count >= 5 or size >= 10000 or
     not integer(total + a.experienceCeilingMicros) or
     total + a.experienceCeilingMicros > a.limitMicros then return 'denied' end
  ledger.reservations[ARGV[6]] = {
    identity = ARGV[5], requestKey = ARGV[6], briefId = ARGV[7], fingerprint = ARGV[8],
    day = day, reservedMicros = a.experienceCeilingMicros, dispatched = false
  }
elseif ARGV[1] == 'dispatch' then
  if not dispatch or dispatch.fingerprint ~= ARGV[8] or dispatch.dispatched or
     not string.find(ARGV[9], '|' .. dispatch.identity .. '|', 1, true) then return 'denied' end
  dispatch.dispatched = true
else return 'denied' end
redis.call('SET', KEYS[1], cjson.encode(ledger))
return 'reserved'
`;

export function createRedisBetaAdmissionLedger(
  environment: Environment = process.env,
  fetchImplementation: typeof fetch = fetch,
): BetaAdmissionLedger | null {
  const authorityId = environment[BETA_SPENDING_AUTHORITY_ENV];
  const roster = invitations(environment);
  const url = environment.UPSTASH_REDIS_REST_URL ?? environment.KV_REST_API_URL;
  const credential = environment.UPSTASH_REDIS_REST_URL
    ? environment.UPSTASH_REDIS_REST_TOKEN
    : environment.KV_REST_API_TOKEN;
  if (!roster || !authorityId || !IDENTITY.test(authorityId) || !url || !credential) return null;
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
        "EVAL", BETA_ADMISSION_SCRIPT, "1", BETA_LEDGER_KEY,
        operation, authorityId, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
        String(FIRST_PREVIEW_COST_CONTRACT.lifetimeBudgetPerConceptBriefMicros),
        input.identity ?? "", input.requestKey ?? "", input.briefId, input.fingerprint,
        `|${roster!.map(value => value.identity).join("|")}|`,
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
