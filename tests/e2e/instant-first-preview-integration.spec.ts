import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
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
  FirstPreviewCustomerViewDatabaseClient,
} from "../../lib/server/ai-sketch/supabase-first-preview-customer-view";

const moduleInternals = Module as unknown as {
  _load(
    request: string,
    parent: unknown,
    isMain: boolean,
  ): unknown;
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
  createSupabaseFirstPreviewCustomerAccessAuthorizer,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/supabase-first-preview-customer-access",
    ) as typeof import("../../lib/server/ai-sketch/supabase-first-preview-customer-access"),
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
  INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV,
  isInstantFirstPreviewAgentEnabled,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/instant-first-preview-feature-flag",
    ) as typeof import("../../lib/server/ai-sketch/instant-first-preview-feature-flag"),
);
const { createPersistedConceptBriefResponse } = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../app/api/concept-briefs/route",
    ) as typeof import("../../app/api/concept-briefs/route"),
);

const NOW = 1_785_283_200;
const SECRET =
  "novora-test-only-customer-view-signing-secret-000000000000";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "323e4567-e89b-42d3-a456-426614174000";
const SECOND_JOB_ID = "333e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const NONCE = "integration_nonce_7iJ9vH2mQ4xK";
const HASH = "a".repeat(64);
const CREATED_AT = "2026-07-23T10:00:00.000001Z";
const VALIDATED_AT = "2026-07-23T10:00:01.000001Z";
const GATED_AT = "2026-07-23T10:00:02.000001Z";
const READY_AT = "2026-07-23T10:00:03.000001Z";
const REVOKED_AT = "2026-07-23T10:00:04.000001Z";

function epochIso(epochSeconds: number) {
  return new Date(epochSeconds * 1_000).toISOString();
}

function persistedIdentity() {
  return {
    persisted: true as const,
    publicReference: PUBLIC_REFERENCE,
    conceptBriefId: BRIEF_ID,
  };
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
  const attemptNumber =
    overrides.attempt_number === 2 ? 2 : 1;
  return {
    id: JOB_ID,
    concept_brief_id: BRIEF_ID,
    generation_purpose: "first_preview",
    attempt_number: attemptNumber,
    lineage_identity: "first-preview:v1",
    parent_job_id: attemptNumber === 2 ? JOB_ID : null,
    parent_generation_purpose:
      attemptNumber === 2 ? "first_preview" : null,
    parent_attempt_number: attemptNumber === 2 ? 1 : null,
    source_output_id: null,
    design_spec_version: "novora_design_spec_v1",
    design_spec_hash: HASH,
    hand_sketch_instruction_version: "novora_hand_sketch_v1",
    hand_sketch_instruction_hash: HASH,
    status: "succeeded",
    failure_category: null,
    retry_eligible: null,
    terminal_reason: null,
    started_at: CREATED_AT,
    deadline_at: GATED_AT,
    completed_at: GATED_AT,
    failed_at: null,
    cancelled_at: null,
    timed_out_at: null,
    created_at: CREATED_AT,
    updated_at: READY_AT,
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

function reader(
  database: FakeViewDatabase,
  options: Readonly<{
    cookieStore?: Readonly<{
      get(name: string): Readonly<{ value: string }> | undefined;
    }>;
    cookieValue?: string | null;
    featureFlagValue?: string | null;
    signingSecret?: string | null;
    sourceAvailable?: boolean;
    onCreateSource?: () => void;
  }> = {},
) {
  const cookieValue = Object.prototype.hasOwnProperty.call(
    options,
    "cookieValue",
  )
    ? options.cookieValue
    : proof();
  const cookieStore =
    options.cookieStore ??
    ({
      get(name: string) {
        return name === FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME &&
          typeof cookieValue === "string"
          ? { value: cookieValue }
          : undefined;
      },
    } as const);
  const bindingModulePath = testRequire.resolve(
    "../../lib/server/ai-sketch/first-preview-customer-view-binding",
  );
  const originalLoad = moduleInternals._load;
  delete testRequire.cache[bindingModulePath];
  moduleInternals._load = function loadProductionBindingDependency(
    request,
    parent,
    isMain,
  ) {
    if (request === "next/headers") {
      return { cookies: async () => cookieStore };
    }
    if (request === "../supabase") {
      return {
        createSupabaseAdminClientOrNull() {
          options.onCreateSource?.();
          return options.sourceAvailable === false ? null : {};
        },
      };
    }
    if (request === "./supabase-first-preview-customer-view") {
      return {
        createFirstPreviewCustomerViewDatabaseClient() {
          return database;
        },
        createSupabaseFirstPreviewCustomerViewStateSource() {
          return createSupabaseFirstPreviewCustomerViewStateSource(database, {
            clock: () => NOW,
          });
        },
        createUnavailableFirstPreviewCustomerViewStateSource() {
          return {
            readExactCustomerPreviewState() {
              return { state: "unavailable" as const };
            },
          };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  let bindingModule: typeof import("../../lib/server/ai-sketch/first-preview-customer-view-binding");
  try {
    bindingModule = loadWithServerOnlyTestShim(
      () =>
        testRequire(
          bindingModulePath,
        ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-view-binding"),
    );
  } finally {
    moduleInternals._load = originalLoad;
    delete testRequire.cache[bindingModulePath];
  }

  return async (
    request: Parameters<
      typeof bindingModule.readFirstPreviewCustomerViewBinding
    >[0],
  ) => {
    const previousFeatureFlag =
      process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
    const previousSigningSecret =
      process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV];
    const originalDateNow = Date.now;
    const featureFlagValue = Object.prototype.hasOwnProperty.call(
      options,
      "featureFlagValue",
    )
      ? options.featureFlagValue
      : "true";
    const signingSecret = Object.prototype.hasOwnProperty.call(
      options,
      "signingSecret",
    )
      ? options.signingSecret
      : SECRET;
    if (featureFlagValue === null) {
      delete process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
    } else {
      process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV] = featureFlagValue;
    }
    if (signingSecret === null) {
      delete process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV];
    } else {
      process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] =
        signingSecret;
    }
    Date.now = () => NOW * 1_000;
    try {
      return await bindingModule.readFirstPreviewCustomerViewBinding(request);
    } finally {
      Date.now = originalDateNow;
      if (previousFeatureFlag === undefined) {
        delete process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
      } else {
        process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV] =
          previousFeatureFlag;
      }
      if (previousSigningSecret === undefined) {
        delete process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV];
      } else {
        process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] =
          previousSigningSecret;
      }
    }
  };
}

function viewRequest() {
  return { publicReference: PUBLIC_REFERENCE };
}

function queuedJob(overrides: Record<string, unknown> = {}) {
  const createdAt = epochIso(NOW - 30);
  return jobRow({
    status: "queued",
    started_at: null,
    deadline_at: null,
    completed_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  });
}

function processingJob(overrides: Record<string, unknown> = {}) {
  return jobRow({
    status: "processing",
    started_at: epochIso(NOW - 30),
    deadline_at: epochIso(NOW + 30),
    completed_at: null,
    updated_at: epochIso(NOW - 30),
    ...overrides,
  });
}

function retryableFailureJob(overrides: Record<string, unknown> = {}) {
  return jobRow({
    status: "failed",
    failure_category: "network_failure",
    retry_eligible: true,
    terminal_reason: "network_failure",
    started_at: null,
    deadline_at: null,
    completed_at: null,
    failed_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  });
}

function attemptTwoJob(overrides: Record<string, unknown> = {}) {
  return jobRow({
    id: SECOND_JOB_ID,
    attempt_number: 2,
    parent_job_id: JOB_ID,
    parent_generation_purpose: "first_preview",
    parent_attempt_number: 1,
    ...overrides,
  });
}

function notReadyOutputRow(overrides: Record<string, unknown> = {}) {
  return outputRow({
    readiness_status: "not_ready",
    first_preview_ready_at: null,
    readiness_revoked_at: null,
    is_current_customer_preview: false,
    automatic_gate_status: null,
    automatic_gate_evidence: null,
    automatic_gate_policy_version: null,
    automatic_gate_passed_at: null,
    ...overrides,
  });
}

function succeededPendingJob(
  completedAgoSeconds: number,
  overrides: Record<string, unknown> = {},
) {
  const completedAt = NOW - completedAgoSeconds;
  return jobRow({
    created_at: epochIso(completedAt - 30),
    started_at: epochIso(completedAt - 30),
    deadline_at: epochIso(completedAt + 30),
    completed_at: epochIso(completedAt),
    updated_at: epochIso(completedAt),
    ...overrides,
  });
}

function succeededPendingOutputRow(
  completedAgoSeconds: number,
  overrides: Record<string, unknown> = {},
) {
  const completedAt = NOW - completedAgoSeconds;
  return notReadyOutputRow({
    created_at: epochIso(completedAt - 30),
    asset_created_at: epochIso(completedAt - 20),
    asset_validated_at: epochIso(completedAt - 10),
    ...overrides,
  });
}

function causalRetryRows(
  options: Readonly<{
    secondCreatedOffsetSeconds?: number;
    secondStartedOffsetSeconds?: number;
    outputCreatedOffsetSeconds?: number;
  }> = {},
) {
  const failureAt = NOW - 120;
  const secondCreatedAt =
    failureAt + (options.secondCreatedOffsetSeconds ?? 0);
  const secondStartedAt =
    failureAt + (options.secondStartedOffsetSeconds ??
      options.secondCreatedOffsetSeconds ??
      0);
  const outputCreatedAt =
    secondStartedAt + (options.outputCreatedOffsetSeconds ?? 0);
  return {
    jobs: [
      retryableFailureJob({
        created_at: epochIso(failureAt - 60),
        failed_at: epochIso(failureAt),
        updated_at: epochIso(failureAt),
      }),
      attemptTwoJob({
        created_at: epochIso(secondCreatedAt),
        started_at: epochIso(secondStartedAt),
        deadline_at: epochIso(secondStartedAt + 60),
        completed_at: epochIso(secondStartedAt + 30),
        updated_at: epochIso(secondStartedAt + 40),
      }),
    ],
    output: outputRow({
      job_id: SECOND_JOB_ID,
      created_at: epochIso(outputCreatedAt),
      asset_created_at: epochIso(outputCreatedAt + 5),
      asset_validated_at: epochIso(outputCreatedAt + 10),
      automatic_gate_passed_at: epochIso(secondStartedAt + 35),
      first_preview_ready_at: epochIso(secondStartedAt + 40),
    }),
  };
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
      await reader(database, { cookieValue: "invalid" })(viewRequest()),
    ).toEqual({ state: "denied" });
    expect(database.requests).toEqual([]);
  });

  test("actual default binding reads only the exact frozen HttpOnly cookie", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [queuedJob()];
    const requestedNames: string[] = [];
    let sourceConstructions = 0;
    expect(
      await reader(database, {
        cookieStore: {
          get(name) {
            requestedNames.push(name);
            return name === FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME
              ? { value: proof() }
              : undefined;
          },
        },
        onCreateSource() {
          sourceConstructions += 1;
        },
      })(viewRequest()),
    ).toEqual({ state: "pending", pollAfterMs: 5_000 });
    expect(requestedNames).toEqual([
      FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
    ]);
    expect(sourceConstructions).toBe(1);

    const wrongCookieDatabase = new FakeViewDatabase();
    let wrongCookieSourceConstructions = 0;
    expect(
      await reader(wrongCookieDatabase, {
        cookieStore: {
          get(name) {
            return name === "novora_first_preview_access"
              ? { value: proof() }
              : undefined;
          },
        },
        onCreateSource() {
          wrongCookieSourceConstructions += 1;
        },
      })(viewRequest()),
    ).toEqual({ state: "denied" });
    expect(wrongCookieSourceConstructions).toBe(0);
    expect(wrongCookieDatabase.requests).toEqual([]);
  });

  test("missing, empty, and malformed exact-cookie proofs never construct a source", async () => {
    for (const cookieValue of [null, "", "invalid"] as const) {
      const database = new FakeViewDatabase();
      let sourceConstructions = 0;
      expect(
        await reader(database, {
          cookieValue,
          onCreateSource() {
            sourceConstructions += 1;
          },
        })(viewRequest()),
      ).toEqual({ state: "denied" });
      expect(sourceConstructions).toBe(0);
      expect(database.requests).toEqual([]);
    }
  });

  test("missing cookie proof is denied before source construction", async () => {
    const database = new FakeViewDatabase();
    let sourceConstructions = 0;
    expect(
      await reader(database, {
        cookieValue: null,
        onCreateSource: () => {
          sourceConstructions += 1;
        },
      })(viewRequest()),
    ).toEqual({ state: "denied" });
    expect(sourceConstructions).toBe(0);
    expect(database.requests).toEqual([]);
  });

  test("body, query, or header-like proof fields cannot substitute for the cookie", async () => {
    const database = new FakeViewDatabase();
    let sourceConstructions = 0;
    const untrustedRequest = {
      publicReference: PUBLIC_REFERENCE,
      accessProof: proof(),
      bodyProof: proof(),
      queryProof: proof(),
      headerProof: proof(),
    };
    expect(
      await reader(database, {
        cookieValue: null,
        onCreateSource: () => {
          sourceConstructions += 1;
        },
      })(untrustedRequest),
    ).toEqual({ state: "denied" });
    expect(sourceConstructions).toBe(0);
    expect(database.requests).toEqual([]);
  });

  test("valid exact-cookie proof preserves proof-before-source ordering", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [queuedJob()];
    let sourceConstructions = 0;
    expect(
      await reader(database, {
        cookieValue: proof(),
        onCreateSource: () => {
          sourceConstructions += 1;
        },
      })(viewRequest()),
    ).toEqual({ state: "pending", pollAfterMs: 5_000 });
    expect(sourceConstructions).toBe(1);
  });

  test("valid proof invokes the source only with verified Brief and reference identity", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [queuedJob()];
    const result = await reader(database)(viewRequest());
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
    const result = await reader(database)(viewRequest());
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

  test("rejects contradictory, orphaned, duplicate, and impossible candidate lineages", async () => {
    const readyAttemptTwo = outputRow({ job_id: SECOND_JOB_ID });
    const validJobs = [retryableFailureJob(), attemptTwoJob()];
    const scenarios: Array<Readonly<{
      jobs: unknown[];
      outputs: unknown[];
    }>> = [
      {
        jobs: validJobs,
        outputs: [
          outputRow({
            id: OTHER_OUTPUT_ID,
            readiness_status: "revoked",
            is_current_customer_preview: false,
            readiness_revoked_at: REVOKED_AT,
          }),
          readyAttemptTwo,
        ],
      },
      {
        jobs: validJobs,
        outputs: [
          notReadyOutputRow({ id: OTHER_OUTPUT_ID }),
          readyAttemptTwo,
        ],
      },
      {
        jobs: [queuedJob(), attemptTwoJob()],
        outputs: [readyAttemptTwo],
      },
      {
        jobs: [jobRow({ completed_at: READY_AT })],
        outputs: [outputRow()],
      },
      {
        jobs: [jobRow()],
        outputs: [
          outputRow({
            job_id: "723e4567-e89b-42d3-a456-426614174000",
          }),
        ],
      },
      {
        jobs: [
          retryableFailureJob(),
          attemptTwoJob({
            parent_job_id:
              "823e4567-e89b-42d3-a456-426614174000",
          }),
        ],
        outputs: [readyAttemptTwo],
      },
      {
        jobs: [
          queuedJob(),
          queuedJob({
            id: SECOND_JOB_ID,
            created_at: epochIso(NOW - 20),
            updated_at: epochIso(NOW - 20),
          }),
        ],
        outputs: [],
      },
      {
        jobs: [
          retryableFailureJob(),
          attemptTwoJob(),
          jobRow({
            id: "923e4567-e89b-42d3-a456-426614174000",
            attempt_number: 3,
          }),
        ],
        outputs: [],
      },
    ];

    for (const scenario of scenarios) {
      const database = new FakeViewDatabase();
      database.jobs = [...scenario.jobs];
      database.outputs = [...scenario.outputs];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("accepts one exact attempt-1 to attempt-2 retry lineage", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [retryableFailureJob(), attemptTwoJob()];
    database.outputs = [outputRow({ job_id: SECOND_JOB_ID })];
    expect(await reader(database)(viewRequest())).toEqual({
      state: "ready",
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
  });

  test("rejects retry lineage with changed design or instruction identity", async () => {
    for (const mismatch of [
      { design_spec_hash: "b".repeat(64) },
      { hand_sketch_instruction_hash: "b".repeat(64) },
      { design_spec_version: "different_design_spec" },
      { hand_sketch_instruction_version: "different_instruction" },
    ]) {
      const database = new FakeViewDatabase();
      database.jobs = [
        retryableFailureJob(),
        attemptTwoJob(mismatch),
      ];
      database.outputs = [outputRow({ job_id: SECOND_JOB_ID })];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("enforces cross-attempt failure-to-retry temporal causality", async () => {
    for (const options of [
      {
        secondCreatedOffsetSeconds: -1,
        secondStartedOffsetSeconds: 0,
      },
      {
        secondCreatedOffsetSeconds: -1,
        secondStartedOffsetSeconds: -1,
      },
    ]) {
      const rows = causalRetryRows(options);
      const database = new FakeViewDatabase();
      database.jobs = rows.jobs;
      database.outputs = [rows.output];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }

    for (const secondCreatedOffsetSeconds of [0, 1]) {
      const rows = causalRetryRows({ secondCreatedOffsetSeconds });
      const database = new FakeViewDatabase();
      database.jobs = rows.jobs;
      database.outputs = [rows.output];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "ready",
        assetRequest: {
          publicReference: PUBLIC_REFERENCE,
          outputId: OUTPUT_ID,
        },
      });
    }
  });

  test("attempt-2 Output chronology cannot precede its own Job lifecycle", async () => {
    const rows = causalRetryRows({ outputCreatedOffsetSeconds: -1 });
    const database = new FakeViewDatabase();
    database.jobs = rows.jobs;
    database.outputs = [rows.output];
    expect(await reader(database)(viewRequest())).toEqual({
      state: "unavailable",
    });
  });

  test("succeeded completion must be at or before its deadline", async () => {
    for (const completedAt of [
      "2026-07-23T10:00:01.500001Z",
      GATED_AT,
    ]) {
      const database = new FakeViewDatabase();
      database.jobs = [jobRow({ completed_at: completedAt })];
      database.outputs = [outputRow()];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "ready",
        assetRequest: {
          publicReference: PUBLIC_REFERENCE,
          outputId: OUTPUT_ID,
        },
      });
    }

    const lateDatabase = new FakeViewDatabase();
    lateDatabase.jobs = [
      jobRow({
        completed_at: READY_AT,
        updated_at: READY_AT,
      }),
    ];
    lateDatabase.outputs = [notReadyOutputRow()];
    expect(await reader(lateDatabase)(viewRequest())).toEqual({
      state: "unavailable",
    });
  });

  test("ready Output linked to a late-completed succeeded Job is unavailable", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [
      jobRow({
        completed_at: READY_AT,
        updated_at: READY_AT,
      }),
    ];
    database.outputs = [outputRow()];
    expect(await reader(database)(viewRequest())).toEqual({
      state: "unavailable",
    });
  });

  test("ready output remains compatible with the protected asset-route identity", async () => {
    const database = new FakeViewDatabase();
    database.outputs = [outputRow()];
    database.jobs = [jobRow()];
    const result = await reader(database)(viewRequest());
    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready");
    expect(
      `/api/first-preview-assets/${result.assetRequest.publicReference}/${result.assetRequest.outputId}`,
    ).toBe(
      `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`,
    );

    const authorizer =
      createSupabaseFirstPreviewCustomerAccessAuthorizer(
        {
          async findBriefCandidates() {
            return {
              data: [
                {
                  id: BRIEF_ID,
                  public_reference: PUBLIC_REFERENCE,
                },
              ],
              error: null,
            };
          },
          async findOutputCandidates() {
            return { data: [outputRow()], error: null };
          },
          async findJobCandidates() {
            return {
              data: [
                {
                  id: JOB_ID,
                  concept_brief_id: BRIEF_ID,
                  generation_purpose: "first_preview",
                  status: "succeeded",
                  completed_at: READY_AT,
                },
              ],
              error: null,
            };
          },
        },
        SECRET,
        { clock: () => NOW },
      );
    expect(
      await authorizer.authorize({
        publicReference: result.assetRequest.publicReference,
        outputId: result.assetRequest.outputId,
        accessProof: proof(),
      }),
    ).toMatchObject({ authorized: true });
  });

  test("enforces canonical complete ready-asset chronology", async () => {
    const invalidOutputs = [
      outputRow({
        asset_created_at: "2026-07-23 10:00:00Z",
      }),
      outputRow({
        asset_created_at: "2026-07-23T10:00:01.000002Z",
      }),
      outputRow({
        asset_validated_at: "2026-07-23T10:00:02.000002Z",
      }),
      outputRow({
        automatic_gate_passed_at:
          "2026-07-23T10:00:03.000002Z",
      }),
      outputRow({ asset_created_at: null }),
    ];
    for (const invalidOutput of invalidOutputs) {
      const database = new FakeViewDatabase();
      database.jobs = [jobRow()];
      database.outputs = [invalidOutput];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("returns deterministic pending for valid active Jobs or an eligible first retry", async () => {
    for (const jobs of [
      [queuedJob()],
      [processingJob()],
      [
        retryableFailureJob({
          created_at: epochIso(NOW - 60),
          failed_at: epochIso(NOW - 30),
          updated_at: epochIso(NOW - 30),
        }),
      ],
    ]) {
      const database = new FakeViewDatabase();
      database.jobs = jobs;
      const request = viewRequest();
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

  test("keeps only a permitted succeeded completion window pending", async () => {
    const database = new FakeViewDatabase();
    database.jobs = [succeededPendingJob(30)];
    database.outputs = [succeededPendingOutputRow(30)];
    expect(await reader(database)(viewRequest())).toEqual({
      state: "pending",
      pollAfterMs: 5_000,
    });
  });

  test("succeeded gate-pending state expires at the exact bounded boundary", async () => {
    for (const completedAgoSeconds of [1_799]) {
      const database = new FakeViewDatabase();
      database.jobs = [succeededPendingJob(completedAgoSeconds)];
      database.outputs = [
        succeededPendingOutputRow(completedAgoSeconds, {
          automatic_gate_status: "pending",
          automatic_gate_policy_version:
            FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
        }),
      ];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "pending",
        pollAfterMs: 5_000,
      });
    }

    for (const completedAgoSeconds of [1_800, 1_801, 7 * 24 * 60 * 60]) {
      const database = new FakeViewDatabase();
      database.jobs = [succeededPendingJob(completedAgoSeconds)];
      database.outputs = [
        succeededPendingOutputRow(completedAgoSeconds, {
          automatic_gate_status: "pending",
          automatic_gate_policy_version:
            FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
        }),
      ];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("queued, processing, and retry pending expire at exact boundaries", async () => {
    const scenarios = [
      {
        jobs: [
          queuedJob({
            created_at: epochIso(NOW - 1_800),
            updated_at: epochIso(NOW - 1_800),
          }),
        ],
      },
      {
        jobs: [
          processingJob({
            started_at: epochIso(NOW - 60),
            deadline_at: epochIso(NOW),
            updated_at: epochIso(NOW - 60),
          }),
        ],
      },
      {
        jobs: [
          retryableFailureJob({
            created_at: epochIso(NOW - 1_860),
            failed_at: epochIso(NOW - 1_800),
            updated_at: epochIso(NOW - 1_800),
          }),
        ],
      },
    ];
    for (const scenario of scenarios) {
      const database = new FakeViewDatabase();
      database.jobs = scenario.jobs;
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("maps stale active, gate-failed, malformed, conflicting, and exhausted states to unavailable", async () => {
    const failedAsset = notReadyOutputRow({
      asset_validation_status: "failed",
      asset_validated_at: null,
    });
    const failedGate = notReadyOutputRow({
      automatic_gate_status: "failed",
      automatic_gate_evidence: { result: "failed" },
      automatic_gate_policy_version:
        FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    });
    const exhaustedAttemptTwo = attemptTwoJob({
      status: "failed",
      failure_category: "network_failure",
      retry_eligible: true,
      terminal_reason: "network_failure",
      started_at: null,
      deadline_at: null,
      completed_at: null,
      failed_at: READY_AT,
    });
    const scenarios: Array<Readonly<{
      jobs: unknown[];
      outputs: unknown[];
    }>> = [
      {
        jobs: [
          queuedJob({
            created_at: epochIso(NOW - 1_801),
            updated_at: epochIso(NOW - 1_801),
          }),
        ],
        outputs: [],
      },
      {
        jobs: [
          processingJob({
            started_at: epochIso(NOW - 60),
            deadline_at: epochIso(NOW - 1),
            updated_at: epochIso(NOW - 60),
          }),
        ],
        outputs: [],
      },
      { jobs: [jobRow()], outputs: [failedAsset] },
      { jobs: [jobRow()], outputs: [failedGate] },
      {
        jobs: [
          jobRow({
            status: "failed",
            retry_eligible: false,
            completed_at: null,
            failed_at: READY_AT,
          }),
        ],
        outputs: [],
      },
      {
        jobs: [
          queuedJob(),
          attemptTwoJob({
            status: "processing",
            started_at: epochIso(NOW - 20),
            deadline_at: epochIso(NOW + 20),
            completed_at: null,
            updated_at: epochIso(NOW - 20),
          }),
        ],
        outputs: [],
      },
      {
        jobs: [retryableFailureJob(), exhaustedAttemptTwo],
        outputs: [],
      },
      { jobs: [], outputs: [] },
    ];
    for (const scenario of scenarios) {
      const database = new FakeViewDatabase();
      database.jobs = [...scenario.jobs];
      database.outputs = [...scenario.outputs];
      expect(await reader(database)(viewRequest())).toEqual({
        state: "unavailable",
      });
    }
  });

  test("maps deterministic terminal and revoked conditions to unavailable", async () => {
    const scenarios = [
      {
        outputs: [],
        jobs: [
          retryableFailureJob({ retry_eligible: false }),
        ],
      },
      {
        outputs: [],
        jobs: [
          jobRow({
            status: "timed_out",
            failure_category: "timeout",
            retry_eligible: false,
            terminal_reason: "timeout",
            started_at: CREATED_AT,
            deadline_at: GATED_AT,
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
            readiness_revoked_at: REVOKED_AT,
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
        await reader(database)(viewRequest()),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("exact Brief/public-reference mismatch fails closed", async () => {
    const database = new FakeViewDatabase();
    database.briefs = [
      { id: OTHER_BRIEF_ID, public_reference: PUBLIC_REFERENCE },
    ];
    expect(
      await reader(database)(viewRequest()),
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
        await reader(database)(viewRequest()),
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
        await reader(database)(viewRequest()),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("returned database failures and exceptions become safe unavailable", async () => {
    for (const operation of ["brief", "output", "job"] as const) {
      for (const mode of ["returned", "thrown"] as const) {
        const database = new FakeViewDatabase();
        if (mode === "returned") database.fail = operation;
        else database.throwOperation = operation;
        const result = await reader(database)(viewRequest());
        expect(result).toEqual({ state: "unavailable" });
        expect(JSON.stringify(result)).not.toContain("PRIVATE_");
      }
    }
  });

  test("missing feature, secret, or source configuration is safe", async () => {
    for (const options of [
      { featureFlagValue: "false" },
      { signingSecret: null },
      { sourceAvailable: false },
    ]) {
      expect(
        await reader(new FakeViewDatabase(), options)(viewRequest()),
      ).toEqual({ state: "unavailable" });
    }
  });

  test("cross-customer proof is denied without source access", async () => {
    const database = new FakeViewDatabase();
    expect(
      await reader(database, {
        cookieValue: proof({ briefId: OTHER_BRIEF_ID }),
      })(viewRequest()),
    ).toEqual({ state: "unavailable" });
    // A valid proof for another Brief can pass cryptographic verification, but
    // the exact Brief/reference database linkage still fails closed.
    expect(database.requests.map((request) => request.operation)).toEqual([
      "brief",
    ]);
  });

  test("Production module exports no arbitrary raw-proof reader or factory", () => {
    const bindingModule = loadWithServerOnlyTestShim(
      () =>
        testRequire(
          "../../lib/server/ai-sketch/first-preview-customer-view-binding",
        ) as Record<string, unknown>,
    );
    expect(Object.keys(bindingModule).sort()).toEqual([
      "readFirstPreviewCustomerViewBinding",
    ]);

    const source = readFileSync(
      path.join(
        process.cwd(),
        "lib/server/ai-sketch/first-preview-customer-view-binding.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      "readExactFirstPreviewCustomerAccessCookie(await cookies())",
    );
    expect(source).toContain(
      "cookieStore.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)",
    );
    expect(source).not.toContain("request.accessProof");
    expect(source).not.toContain("FirstPreviewCustomerAccessProofReader");
    expect(source).not.toContain("createFirstPreviewCustomerViewBinding");
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
