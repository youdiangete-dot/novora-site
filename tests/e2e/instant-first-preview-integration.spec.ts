import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createFirstPreviewCustomerAccessProof,
} from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import {
  deriveFirstPreviewGeneratedAssetId,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import type {
  FirstPreviewCustomerPreviewStateSource,
} from "../../lib/server/ai-sketch/first-preview-customer-view";
import type {
  FirstPreviewCustomerViewDatabaseClient,
} from "../../lib/server/ai-sketch/supabase-first-preview-customer-view";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const serverOnlyTestShim = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);

function loadWithServerOnlyTestShim<T>(load: () => T): T {
  const original = moduleInternals._resolveFilename;
  moduleInternals._resolveFilename = function resolveTestModule(
    request,
    parent,
    isMain,
    options,
  ) {
    return request === "server-only"
      ? serverOnlyTestShim
      : original.call(this, request, parent, isMain, options);
  };
  try {
    return load();
  } finally {
    moduleInternals._resolveFilename = original;
  }
}

const testRequire = createRequire(
  path.join(
    process.cwd(),
    "tests",
    "e2e",
    "instant-first-preview-integration.spec.ts",
  ),
);
const {
  issueFirstPreviewCustomerSession,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/first-preview-customer-session",
    ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-session"),
);
const {
  createFirstPreviewCustomerViewBinding,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/first-preview-customer-view-binding",
    ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-view-binding"),
);
const {
  FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  createSupabaseFirstPreviewCustomerViewStateSource,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/supabase-first-preview-customer-view",
    ) as typeof import("../../lib/server/ai-sketch/supabase-first-preview-customer-view"),
);
const {
  attachFirstPreviewCustomerSessionCookie,
  isInstantFirstPreviewAgentEnabled,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/instant-first-preview-feature-flag",
    ) as typeof import("../../lib/server/ai-sketch/instant-first-preview-feature-flag"),
);

const NOW = 1_785_283_200;
const SECRET =
  "novora-test-only-customer-view-signing-secret-000000000000";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "323e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const NONCE = "integration_nonce_7iJ9vH2mQ4xK";
const HASH = "a".repeat(64);
const CREATED_AT = "2026-07-23T10:00:00.000001Z";
const VALIDATED_AT = "2026-07-23T10:00:01.000001Z";
const GATED_AT = "2026-07-23T10:00:02.000001Z";
const READY_AT = "2026-07-23T10:00:03.000001Z";

function persistedIdentity() {
  return {
    persisted: true as const,
    publicReference: PUBLIC_REFERENCE,
    conceptBriefId: BRIEF_ID,
  };
}

function createPersistedConceptBriefResponse(
  persistence: ReturnType<typeof persistedIdentity>,
  dependencies: Parameters<
    typeof attachFirstPreviewCustomerSessionCookie
  >[2] = {},
) {
  let setCookie: string | null = null;
  const body = {
    ok: true,
    mode: "supabase",
    persisted: true,
    message:
      "Concept Brief submitted for NOVORA review. This is not CAD approval, pricing approval, sourcing confirmation, or production confirmation.",
    publicReference: persistence.publicReference,
    conceptBriefId: persistence.conceptBriefId,
  };
  const response = {
    status: 201,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "set-cookie" ? setCookie : null;
      },
    },
    async json() {
      return body;
    },
    cookies: {
      set(
        name: string,
        value: string,
        options: {
          httpOnly: true;
          secure: true;
          sameSite: "strict";
          path: "/";
          maxAge: number;
        },
      ) {
        setCookie = [
          `${name}=${value}`,
          `Path=${options.path}`,
          `Max-Age=${options.maxAge}`,
          options.httpOnly ? "HttpOnly" : "",
          options.secure ? "Secure" : "",
          `SameSite=${options.sameSite}`,
        ]
          .filter(Boolean)
          .join("; ");
      },
    },
  };
  return attachFirstPreviewCustomerSessionCookie(
    response,
    persistence,
    dependencies,
  );
}

function proof(
  overrides: Partial<{ briefId: string; publicReference: string }> = {},
) {
  const value = createFirstPreviewCustomerAccessProof(
    {
      briefId: overrides.briefId ?? BRIEF_ID,
      publicReference: overrides.publicReference ?? PUBLIC_REFERENCE,
      nonce: NONCE,
      issuedAt: NOW - 30,
      expiresAt: NOW + 1_770,
    },
    SECRET,
  );
  if (!value) throw new Error("synthetic proof must be valid");
  return value;
}

function automaticGateEvidence() {
  return {
    result: "passed",
    outputValid: true,
    assetExists: true,
    ownershipConsistent: true,
    privacyPassed: true,
    customerAccessEligible: true,
    lifecycleEligible: true,
  };
}

function outputRow(overrides: Record<string, unknown> = {}) {
  const outputId =
    typeof overrides.id === "string" ? overrides.id : OUTPUT_ID;
  const jobId =
    typeof overrides.job_id === "string" ? overrides.job_id : JOB_ID;
  const conceptBriefId =
    typeof overrides.concept_brief_id === "string"
      ? overrides.concept_brief_id
      : BRIEF_ID;
  return {
    id: outputId,
    job_id: jobId,
    concept_brief_id: conceptBriefId,
    bucket_name: FIRST_PREVIEW_ASSET_BUCKET,
    object_path: deriveFirstPreviewGeneratedAssetId({
      conceptBriefId,
      jobId,
      outputId,
    }),
    mime_type: "image/png",
    byte_size: 2048,
    width_px: 1024,
    height_px: 1024,
    content_sha256: HASH,
    asset_created_at: CREATED_AT,
    asset_validation_status: "passed",
    asset_validated_at: VALIDATED_AT,
    automatic_gate_status: "passed",
    automatic_gate_evidence: automaticGateEvidence(),
    automatic_gate_policy_version:
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    automatic_gate_passed_at: GATED_AT,
    readiness_status: "first_preview_ready",
    first_preview_ready_at: READY_AT,
    readiness_revoked_at: null,
    is_current_customer_preview: true,
    created_at: CREATED_AT,
    ...overrides,
  };
}

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    concept_brief_id: BRIEF_ID,
    generation_purpose: "first_preview",
    attempt_number: 1,
    status: "succeeded",
    retry_eligible: null,
    completed_at: READY_AT,
    failed_at: null,
    cancelled_at: null,
    timed_out_at: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

class FakeViewDatabase implements FirstPreviewCustomerViewDatabaseClient {
  briefs: unknown[] = [
    { id: BRIEF_ID, public_reference: PUBLIC_REFERENCE },
  ];
  outputs: unknown[] = [];
  jobs: unknown[] = [];
  requests: Array<{ operation: string; identity: string; limit: number }> = [];
  fail: "brief" | "output" | "job" | null = null;
  throwOperation: "brief" | "output" | "job" | null = null;

  private result(operation: "brief" | "output" | "job", data: unknown[]) {
    if (this.throwOperation === operation) {
      throw new Error(`PRIVATE_${operation.toUpperCase()}_ERROR`);
    }
    return this.fail === operation
      ? { data: null, error: { kind: "unavailable" as const } }
      : { data, error: null };
  }

  async findBriefCandidates(
    publicReference: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ) {
    this.requests.push({
      operation: "brief",
      identity: publicReference,
      limit,
    });
    return this.result("brief", this.briefs);
  }

  async findOutputCandidates(
    conceptBriefId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ) {
    this.requests.push({
      operation: "output",
      identity: conceptBriefId,
      limit,
    });
    return this.result("output", this.outputs);
  }

  async findJobCandidates(
    conceptBriefId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_VIEW_CANDIDATE_LIMIT,
  ) {
    this.requests.push({
      operation: "job",
      identity: conceptBriefId,
      limit,
    });
    return this.result("job", this.jobs);
  }
}

function reader(database: FakeViewDatabase, enabled = true) {
  return createFirstPreviewCustomerViewBinding({
    enabled,
    signingSecret: SECRET,
    clock: () => NOW,
    stateSource:
      createSupabaseFirstPreviewCustomerViewStateSource(database),
  });
}

test.describe("strict First Preview feature flag and session route binding", () => {
  test("enables only the exact approved representation", () => {
    expect(isInstantFirstPreviewAgentEnabled("true")).toBe(true);
    for (const value of [
      undefined,
      null,
      "",
      " true",
      "true ",
      "TRUE",
      "1",
      "yes",
      "false",
      true,
    ]) {
      expect(isInstantFirstPreviewAgentEnabled(value)).toBe(false);
    }
  });

  test("flag-off preserves the exact successful Concept Brief response", async () => {
    const response = createPersistedConceptBriefResponse(
      persistedIdentity(),
      { featureFlagValue: "false" },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      mode: "supabase",
      persisted: true,
      message:
        "Concept Brief submitted for NOVORA review. This is not CAD approval, pricing approval, sourcing confirmation, or production confirmation.",
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  test("flag-off performs no issuance, nonce generation, or secret access", () => {
    let issueCalls = 0;
    let nonceCalls = 0;
    const dependencies: Record<string, unknown> = {
      featureFlagValue: "false",
      issueSession() {
        issueCalls += 1;
        throw new Error("must not issue");
      },
      nonceSource() {
        nonceCalls += 1;
        throw new Error("must not generate");
      },
    };
    Object.defineProperty(dependencies, "signingSecret", {
      enumerable: true,
      get() {
        throw new Error("must not read secret");
      },
    });
    const response = createPersistedConceptBriefResponse(
      persistedIdentity(),
      dependencies,
    );
    expect(issueCalls).toBe(0);
    expect(nonceCalls).toBe(0);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  test("literal persisted false never invokes issuance", () => {
    let issueCalls = 0;
    const response = createPersistedConceptBriefResponse(
      { ...persistedIdentity(), persisted: false } as never,
      {
        featureFlagValue: "true",
        signingSecret: SECRET,
        issueSession(input) {
          issueCalls += 1;
          return issueFirstPreviewCustomerSession(input);
        },
      },
    );
    expect(issueCalls).toBe(0);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  test("missing or malformed signing secret fails safely after persistence", async () => {
    for (const signingSecret of [null, "", "short", ` ${SECRET}`]) {
      const response = createPersistedConceptBriefResponse(
        persistedIdentity(),
        {
          featureFlagValue: "true",
          signingSecret,
          clock: () => NOW,
          nonceSource: () => NONCE,
        },
      );
      expect(response.status).toBe(201);
      expect(response.headers.get("set-cookie")).toBeNull();
      const serialized = JSON.stringify(await response.json());
      if (signingSecret) expect(serialized).not.toContain(signingSecret);
    }
  });

  test("invalid persisted identifiers never issue a cookie", () => {
    for (const persistence of [
      { ...persistedIdentity(), conceptBriefId: "not-a-uuid" },
      { ...persistedIdentity(), publicReference: "not-a-reference" },
    ]) {
      const response = createPersistedConceptBriefResponse(persistence, {
        featureFlagValue: "true",
        signingSecret: SECRET,
        clock: () => NOW,
        nonceSource: () => NONCE,
      });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  test("valid enabled issuance uses the frozen helper and exact hardened cookie", () => {
    let issueCalls = 0;
    const response = createPersistedConceptBriefResponse(
      persistedIdentity(),
      {
        featureFlagValue: "true",
        signingSecret: SECRET,
        clock: () => NOW,
        nonceSource: () => NONCE,
        issueSession(input) {
          issueCalls += 1;
          return issueFirstPreviewCustomerSession(input);
        },
      },
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(issueCalls).toBe(1);
    expect(cookie).toContain("__Host-novora_first_preview_access=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=1800");
    expect(cookie.toLowerCase()).not.toContain("domain=");
    expect(cookie).not.toContain(SECRET);
  });

  test("nonce or issuance exceptions preserve opaque persisted success", async () => {
    for (const dependencies of [
      {
        nonceSource() {
          throw new Error(`PRIVATE_NONCE_${SECRET}`);
        },
      },
      {
        issueSession() {
          throw new Error(`PRIVATE_ISSUANCE_${SECRET}`);
        },
      },
    ]) {
      const response = createPersistedConceptBriefResponse(
        persistedIdentity(),
        {
          featureFlagValue: "true",
          signingSecret: SECRET,
          clock: () => NOW,
          ...dependencies,
        },
      );
      expect(response.status).toBe(201);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(JSON.stringify(await response.json())).not.toContain(SECRET);
    }
  });
});

test.describe("trusted First Preview customer-view production binding", () => {
  test("invalid proof is denied before any state-source interaction", async () => {
    const database = new FakeViewDatabase();
    expect(
      await reader(database)({
        publicReference: PUBLIC_REFERENCE,
        accessProof: "invalid",
      }),
    ).toEqual({ state: "denied" });
    expect(database.requests).toEqual([]);
  });

  test("valid proof invokes the source only with verified Brief and reference identity", async () => {
    const database = new FakeViewDatabase();
    const result = await reader(database)({
      publicReference: PUBLIC_REFERENCE,
      accessProof: proof(),
    });
    expect(result).toEqual({ state: "pending", pollAfterMs: 5_000 });
    expect(database.requests).toEqual([
      {
        operation: "brief",
        identity: PUBLIC_REFERENCE,
        limit: 3,
      },
      { operation: "output", identity: BRIEF_ID, limit: 3 },
      { operation: "job", identity: BRIEF_ID, limit: 3 },
    ]);
    expect(JSON.stringify(database.requests)).not.toContain("outputId");
  });

  test("returns ready only for an exact fully gated current Output and succeeded Job", async () => {
    const database = new FakeViewDatabase();
    database.outputs = [outputRow()];
    database.jobs = [jobRow()];
    const result = await reader(database)({
      publicReference: PUBLIC_REFERENCE,
      accessProof: proof(),
    });
    expect(result).toEqual({
      state: "ready",
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
    expect(Object.keys(result)).toEqual(["state", "assetRequest"]);
    expect(JSON.stringify(result)).not.toMatch(
      /conceptBriefId|jobId|bucket|object_path|sha256|provider|prompt|review|gate|https?:/i,
    );
  });

  test("ready output remains compatible with the protected asset-route identity", async () => {
    const database = new FakeViewDatabase();
    database.outputs = [outputRow()];
    database.jobs = [jobRow()];
    const result = await reader(database)({
      publicReference: PUBLIC_REFERENCE,
      accessProof: proof(),
    });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready");
    expect(
      `/api/first-preview-assets/${result.assetRequest.publicReference}/${result.assetRequest.outputId}`,
    ).toBe(
      `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
    );
  });

  test("returns deterministic pending for no Job, active Job, or retryable first failure", async () => {
    for (const jobs of [
      [],
      [jobRow({ status: "queued", completed_at: null })],
      [
        jobRow({
          status: "failed",
          retry_eligible: true,
          completed_at: null,
          failed_at: READY_AT,
        }),
      ],
    ]) {
      const database = new FakeViewDatabase();
      database.jobs = jobs;
      const request = {
        publicReference: PUBLIC_REFERENCE,
        accessProof: proof(),
      };
      expect(await reader(database)(request)).toEqual({
        state: "pending",
        pollAfterMs: 5_000,
      });
      expect(await reader(database)(request)).toEqual({
        state: "pending",
        pollAfterMs: 5_000,
      });
    }
  });

  test("maps deterministic terminal and revoked conditions to unavailable", async () => {
    const scenarios = [
      {
        outputs: [],
        jobs: [
          jobRow({
            status: "failed",
            retry_eligible: false,
            completed_at: null,
            failed_at: READY_AT,
          }),
        ],
      },
      {
        outputs: [],
        jobs: [
          jobRow({
            status: "timed_out",
            retry_eligible: false,
            completed_at: null,
            timed_out_at: READY_AT,
          }),
        ],
      },
      {
        outputs: [
          outputRow({
            readiness_status: "revoked",
            is_current_customer_preview: false,
            readiness_revoked_at: READY_AT,
          }),
        ],
        jobs: [jobRow()],
      },
    ];
    for (const scenario of scenarios) {
      const database = new FakeViewDatabase();
      database.outputs = scenario.outputs;
      database.jobs = scenario.jobs;
      expect(
        await reader(database)({
          publicReference: PUBLIC_REFERENCE,
          accessProof: proof(),
        }),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("exact Brief/public-reference mismatch fails closed", async () => {
    const database = new FakeViewDatabase();
    database.briefs = [
      { id: OTHER_BRIEF_ID, public_reference: PUBLIC_REFERENCE },
    ];
    expect(
      await reader(database)({
        publicReference: PUBLIC_REFERENCE,
        accessProof: proof(),
      }),
    ).toEqual({ state: "unavailable" });
    expect(database.requests.map((request) => request.operation)).toEqual([
      "brief",
    ]);
  });

  test("duplicate and bounded-overflow candidates fail closed", async () => {
    const duplicateBriefs = new FakeViewDatabase();
    duplicateBriefs.briefs = [
      { id: BRIEF_ID, public_reference: PUBLIC_REFERENCE },
      { id: BRIEF_ID, public_reference: PUBLIC_REFERENCE },
    ];
    const ambiguousOutputs = new FakeViewDatabase();
    ambiguousOutputs.outputs = [
      outputRow(),
      outputRow({ id: OTHER_OUTPUT_ID }),
      outputRow({ id: "623e4567-e89b-42d3-a456-426614174000" }),
    ];
    for (const database of [duplicateBriefs, ambiguousOutputs]) {
      expect(
        await reader(database)({
          publicReference: PUBLIC_REFERENCE,
          accessProof: proof(),
        }),
      ).toEqual({ state: "unavailable" });
      expect(database.requests.every((request) => request.limit === 3)).toBe(
        true,
      );
    }
  });

  test("malformed database values and readiness evidence fail closed", async () => {
    for (const invalidOutput of [
      { malformed: true },
      outputRow({ automatic_gate_status: "failed" }),
      outputRow({ automatic_gate_policy_version: "stale" }),
      outputRow({
        automatic_gate_evidence: {
          ...automaticGateEvidence(),
          privacyPassed: false,
        },
      }),
      outputRow({ object_path: "private/guessed.png" }),
      outputRow({ concept_brief_id: OTHER_BRIEF_ID }),
    ]) {
      const database = new FakeViewDatabase();
      database.outputs = [invalidOutput];
      database.jobs = [jobRow()];
      expect(
        await reader(database)({
          publicReference: PUBLIC_REFERENCE,
          accessProof: proof(),
        }),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("returned database failures and exceptions become safe unavailable", async () => {
    for (const operation of ["brief", "output", "job"] as const) {
      for (const mode of ["returned", "thrown"] as const) {
        const database = new FakeViewDatabase();
        if (mode === "returned") database.fail = operation;
        else database.throwOperation = operation;
        const result = await reader(database)({
          publicReference: PUBLIC_REFERENCE,
          accessProof: proof(),
        });
        expect(result).toEqual({ state: "unavailable" });
        expect(JSON.stringify(result)).not.toContain("PRIVATE_");
      }
    }
  });

  test("missing feature, secret, or source configuration is safe", async () => {
    const countingSource: FirstPreviewCustomerPreviewStateSource = {
      async readExactCustomerPreviewState() {
        throw new Error("must not run");
      },
    };
    for (const binding of [
      createFirstPreviewCustomerViewBinding({
        enabled: false,
        signingSecret: SECRET,
        clock: () => NOW,
        stateSource: countingSource,
      }),
      createFirstPreviewCustomerViewBinding({
        enabled: true,
        signingSecret: null,
        clock: () => NOW,
        stateSource: countingSource,
      }),
    ]) {
      expect(
        await binding({
          publicReference: PUBLIC_REFERENCE,
          accessProof: proof(),
        }),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("cross-customer proof is denied without source access", async () => {
    const database = new FakeViewDatabase();
    expect(
      await reader(database)({
        publicReference: PUBLIC_REFERENCE,
        accessProof: proof({ briefId: OTHER_BRIEF_ID }),
      }),
    ).toEqual({ state: "unavailable" });
    // A valid proof for another Brief can pass cryptographic verification, but
    // the exact Brief/reference database linkage still fails closed.
    expect(database.requests.map((request) => request.operation)).toEqual([
      "brief",
    ]);
  });

  test("all Coordinator lib bindings are mechanically server-only", () => {
    for (const relativePath of [
      "lib/server/ai-sketch/instant-first-preview-feature-flag.ts",
      "lib/server/ai-sketch/first-preview-customer-view-binding.ts",
      "lib/server/ai-sketch/supabase-first-preview-customer-view.ts",
    ]) {
      const source = readFileSync(
        path.join(process.cwd(), relativePath),
        "utf8",
      );
      expect(source.startsWith('import "server-only";')).toBe(true);
    }
  });
});
