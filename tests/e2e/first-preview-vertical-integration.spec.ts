import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import type { InitiationIntent } from "../../lib/server/ai-sketch/first-preview-initiation-contract";

const internal = Module as unknown as { _resolveFilename: (...args: unknown[]) => string };
const originalResolve = internal._resolveFilename;
const requireTest = createRequire(path.join(process.cwd(), "tests/e2e/first-preview-vertical-integration.spec.ts"));
let fixture: typeof import("../fixtures/ai-sketch/synthetic-first-preview-integration");
let contract: typeof import("../../lib/server/ai-sketch/first-preview-initiation-contract");
let signerModule: typeof import("../../services/first-preview-signer/signer");
let databaseModule: typeof import("../../services/first-preview-signer/database");
try {
  internal._resolveFilename = function(request, ...args) {
    return request === "server-only" ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js")
      : originalResolve.call(this, request, ...args);
  };
  fixture = requireTest("../fixtures/ai-sketch/synthetic-first-preview-integration");
  contract = requireTest("../../lib/server/ai-sketch/first-preview-initiation-contract");
  signerModule = requireTest("../../services/first-preview-signer/signer");
  databaseModule = requireTest("../../services/first-preview-signer/database");
} finally { internal._resolveFilename = originalResolve; }

type Fixture = ReturnType<typeof fixture.createSyntheticFirstPreviewIntegration>;
async function throughPreparation(f: Fixture) {
  expect((await f.persist()).persisted).toBe(true);
  expect(await f.publish()).toEqual({ status: "handed_off" });
  expect(f.messages).toHaveLength(1);
  return f.consume(f.messages[0]);
}
async function throughGeneration(f: Fixture) {
  expect((await throughPreparation(f)).disposition).toBe("completed");
  expect(f.messages).toHaveLength(2);
  return f.consume(f.messages[1]);
}
let oldFetch: typeof fetch;
let networkCalls: number;
test.beforeEach(() => {
  oldFetch = globalThis.fetch; networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error("Live network prohibited in synthetic integration"); };
});
test.afterEach(() => { globalThis.fetch = oldFetch; expect(networkCalls).toBe(0); });

test("complete synthetic vertical workflow delivers the exact original cookie-bound private PNG", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  expect(f.cookies).toEqual([]);
  expect((await throughGeneration(f)).disposition).toBe("completed");
  expect(f.events.slice(0, 2)).toEqual(["atomic-receipt", "cookie-after-commit"]);
  const stages = ["select-committed", "bind-committed", "signer-key", "release-committed", "database-consume-proof",
    "fresh-initiation", "queue-generation", "fresh-generation", "fresh-dispatch", "record_dispatch", "provider", "complete"];
  for (let i = 1; i < stages.length; i++) expect(f.events.indexOf(stages[i])).toBeGreaterThan(f.events.indexOf(stages[i-1]));
  expect(f.current()).toMatchObject({ state: "completed", fence: "3", handoff_epoch: "1",
    prepared: { job_id: fixture.JOB }, lease_owner: null });
  expect(f.released()).toMatchObject({ owner: fixture.OWNER, fence: "2", job_id: fixture.JOB, concept_brief_id: fixture.BRIEF });
  expect(f.cookies).toEqual([f.proof.proof]);
  expect(f.controls.providerCalls).toBe(1);
  expect(f.o1.state.combinedCommits).toBe(1);
  expect(f.storage.uploads).toHaveLength(1);
  expect(f.storage.uploads[0].upsert).toBe(false);
  expect(f.keyCopies.every(bytes => bytes.every(byte => byte === 0))).toBe(true);
  const view = await f.read();
  expect(view.ok).toBe(true);
  if (view.ok) expect(view.value.body).toEqual(f.storage.uploads[0].body);
  expect((await f.read("not-a-valid-customer-cookie")).ok).toBe(false);
  expect(JSON.parse(f.o1.state.raw).entries[f.current().prepared!.identity_key].status).toBe("settled");
  for (const message of f.messages) {
    expect(Object.keys(message).sort()).toEqual(["version", "concept_brief_id", "publication_fence", "handoff_epoch", "stage"].sort());
    expect(JSON.stringify(message)).not.toContain("mac_sha256");
    expect(JSON.stringify(message)).not.toContain("synthetic@example.invalid");
  }
});

test("JavaScript canonical HMAC bytes match the actual SQL source's field order and UTF-8/hex framing", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  expect((await throughPreparation(f)).disposition).toBe("completed");
  const proof = f.released()!;
  const sourceText = Buffer.from(proof.source_snapshot_utf8_hex, "hex").toString("utf8");
  expect(sourceText).toContain("café 珠宝 💎");
  expect(Buffer.byteLength(sourceText, "utf8")).toBeGreaterThan(sourceText.length);
  const prepared = JSON.parse(Buffer.from(proof.prepared_utf8_hex, "hex").toString("utf8"));
  const material = contract.prepareFirstPreviewHmacEnvelopeCandidate({ sourceSnapshot: JSON.parse(sourceText),
    prepared, owner: proof.owner, fence: proof.fence, keyId: proof.key_id })!;
  expect(Buffer.from(material.authenticatedBytes)).toEqual(fixture.postgresPreparationBytes(proof));
  expect(createHmac("sha256", Buffer.alloc(32, 0x37)).update(material.authenticatedBytes).digest("hex")).toBe(proof.mac_sha256);
  const sql = readFileSync("docs/novora-pr287-durable-initiation-candidate.sql", "utf8");
  expect(sql).toContain("octet_length(convert_to(v, 'UTF8'))");
  expect(sql).toContain("s.release_envelope IS DISTINCT FROM p_envelope");
});

for (const stage of ["brief", "contact", "intent"] as const) {
  test("atomic " + stage + " failure leaves no receipt, cookie, Outbox or job", async () => {
    const f = fixture.createSyntheticFirstPreviewIntegration(); f.controls.failIntake = stage;
    expect((await f.persist()).persisted).toBe(false);
    expect(f.shared.intakes.size).toBe(0); expect(f.shared.intents.size).toBe(0);
    expect(f.shared.jobs.size).toBe(0); expect(f.cookies).toEqual([]);
    expect(await f.publish()).toEqual({ status: "failed" });
    expect(f.controls.providerCalls).toBe(0);
  });
}
test("identical atomic replay retains the single Brief/Contact/Intent and does not dispatch", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  expect((await f.persist()).persisted).toBe(true);
  expect((await f.persist()).persisted).toBe(true);
  expect(f.shared.intakes.size).toBe(1); expect(f.shared.intents.size).toBe(1);
  expect(f.messages).toEqual([]); expect(f.controls.providerCalls).toBe(0);
});

for (const control of ["signerAuthorized", "noKey", "releaseDenied", "unknownCommit", "releaseIdentityConflict",
  "expireDuringKey", "changeSourceDuringKey", "revokeKey", "tamperMac", "rejectConsumption", "freshDenied"] as const) {
  test(control + " prevents generation handoff and paid execution", async () => {
    const f = fixture.createSyntheticFirstPreviewIntegration();
    f.controls[control] = control === "signerAuthorized" ? false : true;
    expect((await throughPreparation(f)).disposition).toBe("terminal_failure");
    expect(f.messages).toHaveLength(1); expect(f.controls.providerCalls).toBe(0);
    expect(f.o1.state.combinedCommits).toBe(0);
    expect(await f.repository.findCustomerReadyOutput(fixture.BRIEF)).toBeNull();
  });
}
for (const missing of ["authority", "preparationSigner", "freshAdmission", "paidAdmission", "publishWakeup"] as const) {
  test("missing " + missing + " cannot be supplied by a pending Intent or viewing cookie", async () => {
    const f = fixture.createSyntheticFirstPreviewIntegration();
    expect((await f.persist()).persisted).toBe(true);
    expect(await f.publish()).toEqual({ status: "handed_off" });
    f.dependencies[missing] = undefined;
    expect((await f.consume(f.messages[0])).disposition).toBe("terminal_failure");
    expect(f.events).not.toContain("signer-key"); expect(f.controls.providerCalls).toBe(0);
  });
}
test("generation publication requires an independent O1 reservation", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  f.dependencies.paidAdmission = { ...f.o1.admission, reserve: async () => false };
  expect((await throughPreparation(f)).disposition).toBe("terminal_failure");
  expect(f.messages).toHaveLength(1); expect(f.controls.providerCalls).toBe(0);
});
test("tampered customer proof digest cannot be replaced by a valid HMAC", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  const context = f.intake.p_admission_context as NonNullable<InitiationIntent["admission_context"]>;
  context.access_binding = { ...context.access_binding, binding_digest: "0".repeat(64) };
  expect((await throughPreparation(f)).disposition).toBe("terminal_failure");
  expect(f.events).toContain("database-consume-proof");
  expect(f.messages).toHaveLength(1); expect(f.controls.providerCalls).toBe(0);
});
for (const field of ["concept_brief_id", "publication_fence", "handoff_epoch"] as const) {
  test("conflicting queue " + field + " cannot sign or dispatch", async () => {
    const f = fixture.createSyntheticFirstPreviewIntegration();
    expect((await f.persist()).persisted).toBe(true); await f.publish();
    const wakeup = { ...f.messages[0], [field]: field === "concept_brief_id" ? fixture.OUTPUT : "999" };
    expect((await f.consume(wakeup)).disposition).not.toBe("completed");
    expect(f.events).not.toContain("signer-key"); expect(f.controls.providerCalls).toBe(0);
  });
}
test("unsigned preparation and released preparation from a reclaimed fence both fail consumption", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  expect((await f.persist()).persisted).toBe(true); await f.publish();
  const authority = f.dependencies.authority!;
  const message = f.messages[0];
  await authority.claim({ p_owner: authority.owner, p_policy: authority.policy, p_mode: "execute",
    p_concept_brief_id: fixture.BRIEF, p_publication_fence: message.publication_fence,
    p_handoff_epoch: message.handoff_epoch, p_handoff_stage: "initiation" });
  const signed = await f.signer.signAuthoritativePreparation({ concept_brief_id: fixture.BRIEF });
  expect(signed.ok).toBe(true); if (!signed.ok) return;
  const prepared = JSON.parse(Buffer.from(signed.envelope.prepared_utf8_hex, "hex").toString("utf8"));
  const transition = { p_concept_brief_id: fixture.BRIEF, p_owner: authority.owner,
    p_fence: f.current().fence, p_expected_state: "claimed" as const, p_action: "prepare" as const,
    p_policy: authority.policy, p_payload: { prepared } };
  expect((await authority.transition(transition)).ok).toBe(false);
  o1ExpireAndReclaim: {
    f.o1.state.now += 60_001;
    const published = await f.fake.claim({ p_owner: authority.owner, p_policy: authority.policy,
      p_mode: "publish", p_concept_brief_id: fixture.BRIEF, p_publication_fence: null,
      p_handoff_epoch: null, p_handoff_stage: null });
    expect(published.ok).toBe(true);
    if (!published.ok) break o1ExpireAndReclaim;
    await f.fake.claim({ p_owner: authority.owner, p_policy: authority.policy, p_mode: "execute",
      p_concept_brief_id: fixture.BRIEF, p_publication_fence: message.publication_fence,
      p_handoff_epoch: message.handoff_epoch, p_handoff_stage: "initiation" });
  }
  expect((await authority.transition({ ...transition, p_fence: f.current().fence,
    p_payload: { prepared, preparation_envelope: signed.envelope } })).ok).toBe(false);
  expect(f.shared.jobs.size).toBe(0);
});
test("malformed signer requests and absent dedicated database operations fail closed", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  for (const request of [{ concept_brief_id: fixture.BRIEF, owner: fixture.OWNER }, { concept_brief_id: "invalid" }]) {
    expect((await f.signer.signAuthoritativePreparation(request)).ok).toBe(false);
  }
  const inert = signerModule.createFirstPreviewPreparationSignerCandidate({
    database: databaseModule.createAuthoritativePreparationDatabaseCandidate(null), secrets: null });
  expect((await inert.signAuthoritativePreparation({ concept_brief_id: fixture.BRIEF })).ok).toBe(false);
  expect(f.events).toEqual([]);
});
test("duplicate deliveries never duplicate the job, combined spending or Provider call", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  expect((await throughGeneration(f)).disposition).toBe("completed");
  for (const message of f.messages) expect((await f.consume(message)).disposition).not.toBe("completed");
  expect(f.shared.jobs.size).toBe(1); expect(f.controls.providerCalls).toBe(1);
  expect(f.o1.state.combinedCommits).toBe(1); expect(f.storage.uploads).toHaveLength(1);
});
for (const control of ["freshDenied", "skipCombined", "unknownPaid", "safetyDenied", "providerConflict"] as const) {
  test("generation " + control + " prevents readiness and never retries paid execution", async () => {
    const f = fixture.createSyntheticFirstPreviewIntegration();
    expect((await throughPreparation(f)).disposition).toBe("completed");
    f.controls[control] = true;
    expect((await f.consume(f.messages[1])).disposition).toBe("terminal_failure");
    expect(await f.repository.findCustomerReadyOutput(fixture.BRIEF)).toBeNull();
    expect((await f.read()).ok).toBe(false);
    const calls = f.controls.providerCalls;
    expect((await f.consume(f.messages[1])).disposition).not.toBe("completed");
    expect(f.controls.providerCalls).toBe(calls);
    if (control === "freshDenied" || control === "skipCombined") expect(calls).toBe(0);
    if (control === "unknownPaid") {
      expect(calls).toBe(1);
      expect(f.current().state).toBe("operator_hold");
      const entry = JSON.parse(f.o1.state.raw).entries[f.current().prepared!.identity_key];
      expect(entry).toMatchObject({ status: "dispatched", closedAtMs: null });
    }
  });
}
test("uncertain Queue publication preserves identity without automatic resend", async () => {
  const f = fixture.createSyntheticFirstPreviewIntegration();
  await f.persist(); f.controls.failPublish = true;
  expect(await f.publish()).toEqual({ status: "failed" });
  expect(f.messages).toHaveLength(1);
  expect(f.current()).toMatchObject({ state: "publishing", publication_fence: "1", handoff_epoch: "0" });
  expect(f.controls.providerCalls).toBe(0);
});
