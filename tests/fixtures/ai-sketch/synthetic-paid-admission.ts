import { createRequire } from "node:module";
import path from "node:path";
import type * as PaidAdmissionModule from "../../../lib/server/ai-sketch/first-preview-paid-admission";

// Offline Redis command double, not a second limiter. All budget, window,
// quota, identity and concurrency decisions run in the actual source module.
// This models only shared snapshot/CAS semantics; it does not run Redis/Lua.
export function createSyntheticPaidAdmission() {
  // Called after the spec loads its server-only modules with the standard shim.
  const {
    createFirstPreviewPaidAdmission,
    FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY,
    FIRST_PREVIEW_PAID_ADMISSION_POLICY,
    PAID_ADMISSION_COMMIT_SCRIPT,
    PAID_ADMISSION_READ_SCRIPT,
    PAID_ADMISSION_COMBINED_COMMIT_SCRIPT,
  } = createRequire(path.join(process.cwd(), "tests/fixtures/ai-sketch/synthetic-paid-admission.ts"))(
    "../../../lib/server/ai-sketch/first-preview-paid-admission",
  ) as typeof PaidAdmissionModule;
  const state = {
    now: 1_785_715_200_000,
    unavailable: false,
    expiring: false,
    raw: JSON.stringify({
      policyVersion: FIRST_PREVIEW_PAID_ADMISSION_POLICY.version,
      clockMs: 1_785_715_200_000,
      entries: {},
    }),
    beforeRead: null as (() => Promise<void>) | null,
    commands: [] as string[],
    counters: new Map<string, { count: string; expiresAtMs: number }>(),
    unsupportedMultiKey: false,
    ambiguousCombined: false,
    beforeCombined: null as (() => void) | null,
    combinedKeys: [] as string[][],
    combinedCommits: 0,
  };
  const environment: Record<string, string | undefined> = {
    UPSTASH_REDIS_REST_URL: "https://synthetic-redis.example.invalid",
    UPSTASH_REDIS_REST_TOKEN: "synthetic-offline-token",
    NOVORA_INTERNAL_SIGNING_SECRET: "pr287-combined-synthetic-signing-material-only",
  };
  const options: Parameters<typeof createFirstPreviewPaidAdmission>[0] = {
    environment,
    fetchImplementation: async (_url, init) => {
      if (state.unavailable) throw new Error("synthetic transport unavailable");
      const [command, script, count, ...parameters] = JSON.parse(String(init?.body));
      const keys: string[] = parameters.slice(0, Number(count));
      const args: string[] = parameters.slice(Number(count));
      if (command !== "EVAL" || keys[0] !== FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY ||
          (script === PAID_ADMISSION_COMBINED_COMMIT_SCRIPT ? count !== "3" : count !== "1")) {
        throw new Error("unexpected synthetic command");
      }
      state.commands.push(script);
      let result: unknown;
      if (script === PAID_ADMISSION_COMBINED_COMMIT_SCRIPT) {
        state.combinedKeys.push(keys);
        if (state.unsupportedMultiKey) return new Response(JSON.stringify({ error: "synthetic unsupported multi-key" }));
        // Adversarial changes run BEFORE the indivisible modelled execution.
        state.beforeCombined?.();
        // No await or externally callable hook inside the following transition.
        const value = JSON.parse(state.raw);
        const a = JSON.parse(args[1]), g = JSON.parse(args[2]), p = JSON.parse(args[3]);
        const entry = value.entries[a.identity_key];
        const admitted = (key: string, policy: { limit: number; windowSeconds: number }) => {
          const counter = state.counters.get(key);
          return !!counter && /^\d+$/.test(counter.count) && Number(counter.count) >= 1 &&
            Number.isSafeInteger(Number(counter.count)) && Number(counter.count) <= policy.limit &&
            counter.expiresAtMs > state.now && counter.expiresAtMs - state.now <= policy.windowSeconds * 1000;
        };
        let daily = 0, monthly = 0, dispatches = 0, active = 0;
        for (const item of Object.values(value.entries) as Array<{ closedAtMs: number | null; chargeMicros: number; status: string }>) {
          if (item.closedAtMs === null || item.closedAtMs > state.now - 86_400_000) {
            daily += item.chargeMicros; dispatches++;
          }
          if (item.closedAtMs === null || item.closedAtMs > state.now - 2_592_000_000) monthly += item.chargeMicros;
          if (item.status !== "settled") active++;
        }
        const allowed = args.length === 4 && new Set(keys).size === 3 && !state.expiring && state.raw === args[0] &&
          state.now >= value.clockMs && value.policyVersion === p.o1.version &&
          a.state === "dispatch_armed" && a.owner === a.lease_owner && a.owner !== "" &&
          g.version === a.version && g.concept_brief_id === a.concept_brief_id &&
          g.job_id === a.job_id && g.identity_key === a.identity_key && g.fence === a.fence &&
          g.nonce === a.nonce && g.deadline_ms === a.deadline_ms && g.admission_context_digest === a.context_digest &&
          Number.isSafeInteger(g.deadline_ms) && g.deadline_ms <= 9_007_199_254_740_991 &&
          state.now < g.deadline_ms && state.now < a.lease_until_ms &&
          a.key_version === p.key_version && a.rate_policy_version === p.rate_policy_version &&
          keys[1] === a.ip_key && keys[2] === a.email_key &&
          admitted(keys[1], p.ip) && admitted(keys[2], p.email) &&
          !!entry && entry.status === "reserved" && entry.ownerJobId === null &&
          entry.closedAtMs === null && entry.fingerprint === a.fingerprint &&
          daily <= p.o1.budget24HoursMicros && monthly <= p.o1.budget30DaysMicros &&
          dispatches <= p.o1.maximumGenerationDispatches24Hours && active <= p.o1.maximumConcurrentOperations;
        result = 0;
        if (allowed) {
          entry.status = "dispatched"; entry.ownerJobId = a.job_id; value.clockMs = state.now;
          state.raw = JSON.stringify(value);
          state.combinedCommits++;
          result = state.ambiguousCombined ? "1" : 1;
        }
      } else if (script === PAID_ADMISSION_READ_SCRIPT) {
        const raw = state.expiring ? "" : state.raw;
        if (state.beforeRead) await state.beforeRead();
        result = [raw, String(Math.floor(state.now / 1000)), String((state.now % 1000) * 1000)];
      } else if (script === PAID_ADMISSION_COMMIT_SCRIPT) {
        if (state.raw !== args[0]) result = 0;
        else {
          const candidate = JSON.parse(args[1]);
          if (state.now < candidate.clockMs) result = 0;
          else {
            candidate.clockMs = state.now;
            if (args[2]) candidate.entries[args[2]].closedAtMs = state.now;
            state.raw = JSON.stringify(candidate);
            result = 1;
          }
        }
      } else throw new Error("unexpected synthetic script");
      return new Response(JSON.stringify({ result }), { status: 200 });
    },
  };
  return { state, environment, admission: createFirstPreviewPaidAdmission(options),
    seedCounters(ipKey: string, emailKey: string) {
      state.counters.set(ipKey, { count: "1", expiresAtMs: state.now + 600_000 });
      state.counters.set(emailKey, { count: "1", expiresAtMs: state.now + 3_600_000 });
    },
    createInstance: () => createFirstPreviewPaidAdmission(options) };
}
