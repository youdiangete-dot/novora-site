import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES,
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
  createFirstPreviewCustomerAccessProof,
} from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import {
  createFirstPreviewCustomerAccessAuthorizerBinding,
  createSupabaseFirstPreviewCustomerAccessAuthorizer,
} from "../../lib/server/ai-sketch/supabase-first-preview-customer-access";
import {
  deriveFirstPreviewGeneratedAssetId,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  FakeFirstPreviewCustomerAccessDatabaseClient,
} from "../fixtures/ai-sketch/fake-first-preview-customer-access-client";

const NOW = 1_785_283_200;
const SECRET =
  "novora-test-only-first-preview-signing-secret-0000000000000000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const OTHER_REFERENCE = "NOVORA-CB-20260723-B640";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "323e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const NONCE = "test_nonce_7iJ9vH2mQ4xK";
const HASH = "a".repeat(64);
const CREATED_AT = "2026-07-23T10:00:00.000Z";
const VALIDATED_AT = "2026-07-23T10:00:01.000Z";
const GATE_PASSED_AT = "2026-07-23T10:00:02.000Z";
const READY_AT = "2026-07-23T10:00:03.000Z";

function validAutomaticGateEvidence() {
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

function briefRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BRIEF_ID,
    public_reference: PUBLIC_REFERENCE,
    ...overrides,
  };
}

function outputRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OUTPUT_ID,
    job_id: JOB_ID,
    concept_brief_id: BRIEF_ID,
    bucket_name: "novora-ai-sketches",
    object_path: deriveFirstPreviewGeneratedAssetId({
      conceptBriefId: BRIEF_ID,
      jobId: JOB_ID,
      outputId: OUTPUT_ID,
    }),
    mime_type: "image/png",
    byte_size: 4096,
    width_px: 1024,
    height_px: 1024,
    content_sha256: HASH,
    asset_created_at: CREATED_AT,
    asset_validation_status: "passed",
    asset_validated_at: VALIDATED_AT,
    automatic_gate_status: "passed",
    automatic_gate_evidence: validAutomaticGateEvidence(),
    automatic_gate_policy_version:
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    automatic_gate_passed_at: GATE_PASSED_AT,
    readiness_status: "first_preview_ready",
    first_preview_ready_at: READY_AT,
    readiness_revoked_at: null,
    is_current_customer_preview: true,
    created_at: CREATED_AT,
    ...overrides,
  };
}

function expectOpaqueDenial(
  result: unknown,
  additionalSensitiveValues: readonly string[] = [],
) {
  expect(result).toEqual({ authorized: false });
  const serialized = JSON.stringify(result);
  for (const sensitiveValue of [
    FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    "novora_first_preview_automatic_gates_v0",
    "novora_first_preview_automatic_gates_v999",
    "automatic_gate",
    "automaticGate",
    "outputValid",
    "assetExists",
    "ownershipConsistent",
    "privacyPassed",
    "customerAccessEligible",
    "lifecycleEligible",
    CREATED_AT,
    VALIDATED_AT,
    GATE_PASSED_AT,
    READY_AT,
    BRIEF_ID,
    OUTPUT_ID,
    JOB_ID,
    outputRow().object_path,
    HASH,
    "diagnostic",
    "raw error",
    ...additionalSensitiveValues,
  ]) {
    expect(serialized).not.toContain(sensitiveValue);
  }
}

function withoutOutputProperty(property: string) {
  const row: Record<string, unknown> = outputRow();
  delete row[property];
  return row;
}

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    concept_brief_id: BRIEF_ID,
    generation_purpose: "first_preview",
    status: "succeeded",
    completed_at: READY_AT,
    ...overrides,
  };
}

function validProof(
  overrides: Partial<{
    briefId: string;
    publicReference: string;
    nonce: string;
    issuedAt: number;
    expiresAt: number;
  }> = {},
): string {
  const proof = createFirstPreviewCustomerAccessProof(
    {
      briefId: overrides.briefId ?? BRIEF_ID,
      publicReference: overrides.publicReference ?? PUBLIC_REFERENCE,
      nonce: overrides.nonce ?? NONCE,
      issuedAt: overrides.issuedAt ?? NOW - 30,
      expiresAt: overrides.expiresAt ?? NOW + 1770,
    },
    SECRET,
  );
  if (!proof) throw new Error("test proof must be valid");
  return proof;
}

function signedClaims(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", SECRET)
    .update(
      `NOVORA\0first-preview-customer-access\0v1\0hmac-sha-256\0${payload}`,
      "utf8",
    )
    .digest("base64url");
  return `${payload}.${signature}`;
}

function claims(overrides: Record<string, unknown> = {}) {
  return {
    v: 1,
    alg: "HS256",
    aud: FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
    scope: FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
    briefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    nonce: NONCE,
    iat: NOW - 30,
    exp: NOW + 1770,
    ...overrides,
  };
}

function harness() {
  const database = new FakeFirstPreviewCustomerAccessDatabaseClient();
  database.briefCandidates = [briefRow()];
  database.outputCandidates = [outputRow()];
  database.jobCandidates = [jobRow()];
  const authorizer = createSupabaseFirstPreviewCustomerAccessAuthorizer(
    database,
    SECRET,
    { clock: () => NOW },
  );
  return { database, authorizer };
}

async function authorize(
  state: ReturnType<typeof harness>,
  overrides: Partial<{
    publicReference: string;
    outputId: string;
    accessProof: string;
  }> = {},
) {
  return state.authorizer.authorize({
    publicReference: overrides.publicReference ?? PUBLIC_REFERENCE,
    outputId: overrides.outputId ?? OUTPUT_ID,
    accessProof: overrides.accessProof ?? validProof(),
  });
}

test.describe("First Preview customer-access capability and authorizer", () => {
  test("mints a Brief-scoped capability before any Job or Output exists and signs no outputId", () => {
    const proof = createFirstPreviewCustomerAccessProof(
      {
        briefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
        nonce: NONCE,
        issuedAt: NOW - 30,
        expiresAt: NOW + 1770,
      },
      SECRET,
    );

    expect(proof).not.toBeNull();
    const [encodedPayload] = proof!.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      briefId: BRIEF_ID,
      publicReference: PUBLIC_REFERENCE,
      nonce: NONCE,
    });
    expect(payload).not.toHaveProperty("outputId");
  });

  test("authorizes an exact current-policy ready/current Brief, Output, and succeeded Job and permits replay only during lifetime", async () => {
    const state = harness();
    const proof = validProof();
    const first = await authorize(state, { accessProof: proof });
    const replay = await authorize(state, { accessProof: proof });

    expect(first).toEqual(replay);
    expect(first).toEqual({
      authorized: true,
      descriptor: {
        publicReference: PUBLIC_REFERENCE,
        conceptBriefId: BRIEF_ID,
        jobId: JOB_ID,
        outputId: OUTPUT_ID,
        readinessStatus: "first_preview_ready",
        isCurrentCustomerPreview: true,
        asset: {
          assetId: outputRow().object_path,
          assetPersisted: true,
          bucketName: "novora-ai-sketches",
          mimeType: "image/png",
          byteSize: 4096,
          widthPx: 1024,
          heightPx: 1024,
          contentSha256: HASH,
          assetCreatedAt: CREATED_AT,
          assetValidatedAt: VALIDATED_AT,
        },
      },
    });
    expect(state.database.requests).toEqual([
      { operation: "brief", value: PUBLIC_REFERENCE, limit: 2 },
      { operation: "output", value: OUTPUT_ID, limit: 2 },
      { operation: "job", value: JOB_ID, limit: 2 },
      { operation: "brief", value: PUBLIC_REFERENCE, limit: 2 },
      { operation: "output", value: OUTPUT_ID, limit: 2 },
      { operation: "job", value: JOB_ID, limit: 2 },
    ]);
    expect(JSON.stringify(first)).not.toContain("public_reference");
    expect(JSON.stringify(first)).not.toContain("provider");
    expect(JSON.stringify(first)).not.toContain("prompt");
    expect(JSON.stringify(first)).not.toContain("note");
    expect(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME).toBe(
      "__Host-novora_first_preview_access",
    );
    expect(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 1800,
    });
    expect(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES).not.toHaveProperty(
      "domain",
    );
    const [encodedPayload] = proof.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      briefId: BRIEF_ID,
      publicReference: PUBLIC_REFERENCE,
      nonce: NONCE,
    });
    expect(payload).not.toHaveProperty("outputId");
  });

  test("rejects missing, malformed, forged, expired, future-issued, wrong-policy, excessive, and oversized proofs before database access", async () => {
    const valid = validProof();
    const forged = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
    const scenarios = [
      { name: "missing", proof: "" },
      { name: "malformed", proof: "not.a.capability" },
      { name: "forged", proof: forged },
      {
        name: "expired",
        proof: signedClaims(claims({ iat: NOW - 1801, exp: NOW })),
      },
      {
        name: "future issued",
        proof: signedClaims(claims({ iat: NOW + 1, exp: NOW + 1800 })),
      },
      {
        name: "wrong audience",
        proof: signedClaims(claims({ aud: "novora:other" })),
      },
      {
        name: "wrong scope",
        proof: signedClaims(claims({ scope: "first_preview:write" })),
      },
      {
        name: "excessive lifetime",
        proof: signedClaims(
          claims({
            iat: NOW - 30,
            exp:
              NOW -
              30 +
              FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS +
              1,
          }),
        ),
      },
      { name: "oversized", proof: "a".repeat(1025) },
      {
        name: "rotated signing secret",
        proof:
          createFirstPreviewCustomerAccessProof(
            {
              briefId: BRIEF_ID,
              publicReference: PUBLIC_REFERENCE,
              nonce: NONCE,
              issuedAt: NOW - 30,
              expiresAt: NOW + 1770,
            },
            "rotated-test-only-first-preview-signing-secret-00000000000",
          ) ?? "",
      },
      {
        name: "unexpected output claim",
        proof: signedClaims(claims({ outputId: OUTPUT_ID })),
      },
      {
        name: "invalid nonce",
        proof: signedClaims(claims({ nonce: "too-short" })),
      },
      {
        name: "extra claim",
        proof: signedClaims(claims({ customerEmail: "private@example.com" })),
      },
      {
        name: "fixed algorithm",
        proof: signedClaims(claims({ alg: "none" })),
      },
    ];

    for (const scenario of scenarios) {
      await test.step(scenario.name, async () => {
        const state = harness();
        const result = await authorize(state, {
          accessProof: scenario.proof,
        });
        expect(result).toEqual({ authorized: false });
        expect(state.database.requests).toEqual([]);
        if (scenario.proof) {
          expect(JSON.stringify(result)).not.toContain(scenario.proof);
        }
      });
    }
  });

  test("enforces exact reference, Brief, and Output bindings against cross-access and enumeration", async () => {
    const cases = [
      {
        name: "enumerated reference",
        request: { publicReference: OTHER_REFERENCE },
      },
      {
        name: "cross Brief proof",
        request: {
          accessProof: validProof({ briefId: OTHER_BRIEF_ID }),
        },
      },
      {
        name: "cross Output proof",
        request: {
          outputId: OTHER_OUTPUT_ID,
          accessProof: validProof(),
        },
      },
      {
        name: "different signed reference",
        request: {
          accessProof: validProof({ publicReference: OTHER_REFERENCE }),
        },
      },
    ];

    for (const scenario of cases) {
      await test.step(scenario.name, async () => {
        const state = harness();
        expect(await authorize(state, scenario.request)).toEqual({
          authorized: false,
        });
      });
    }

    const crossBriefOutput = harness();
    crossBriefOutput.database.outputCandidates = [
      outputRow({
        id: OTHER_OUTPUT_ID,
        concept_brief_id: OTHER_BRIEF_ID,
      }),
    ];
    expect(await authorize(crossBriefOutput, {
      outputId: OTHER_OUTPUT_ID,
    })).toEqual({ authorized: false });

    const staleSameBriefOutput = harness();
    staleSameBriefOutput.database.outputCandidates = [
      outputRow({
        id: OTHER_OUTPUT_ID,
        object_path: deriveFirstPreviewGeneratedAssetId({
          conceptBriefId: BRIEF_ID,
          jobId: JOB_ID,
          outputId: OTHER_OUTPUT_ID,
        }),
        readiness_status: "revoked",
        readiness_revoked_at: READY_AT,
        is_current_customer_preview: false,
      }),
    ];
    expect(await authorize(staleSameBriefOutput, {
      outputId: OTHER_OUTPUT_ID,
    })).toEqual({ authorized: false });

    const randomOutput = harness();
    randomOutput.database.outputCandidates = [];
    expect(await authorize(randomOutput, {
      outputId: OTHER_OUTPUT_ID,
    })).toEqual({ authorized: false });
  });

  test("rejects zero and duplicate Brief, Output, and Job candidates", async () => {
    for (const operation of ["brief", "output", "job"] as const) {
      for (const candidates of [[], [operation === "brief"
        ? briefRow()
        : operation === "output"
          ? outputRow()
          : jobRow(), operation === "brief"
        ? briefRow()
        : operation === "output"
          ? outputRow()
          : jobRow()]]) {
        const state = harness();
        if (operation === "brief") state.database.briefCandidates = candidates;
        if (operation === "output") state.database.outputCandidates = candidates;
        if (operation === "job") state.database.jobCandidates = candidates;
        expect(await authorize(state)).toEqual({ authorized: false });
      }
    }
  });

  test("rejects not-ready, stale, non-current, revoked, and incorrectly linked Outputs", async () => {
    const invalidOutputs = [
      outputRow({ readiness_status: "not_ready" }),
      outputRow({ id: OTHER_OUTPUT_ID }),
      outputRow({ is_current_customer_preview: false }),
      outputRow({
        readiness_status: "revoked",
        readiness_revoked_at: READY_AT,
        is_current_customer_preview: false,
      }),
      outputRow({ concept_brief_id: OTHER_BRIEF_ID }),
      outputRow({ job_id: OTHER_BRIEF_ID }),
    ];

    for (const invalidOutput of invalidOutputs) {
      const state = harness();
      state.database.outputCandidates = [invalidOutput];
      expect(await authorize(state)).toEqual({ authorized: false });
    }
  });

  test("rejects missing, non-passed, stale, unknown, malformed, and partial automatic-gate evidence", async () => {
    const partialEvidence: Record<string, unknown> =
      validAutomaticGateEvidence();
    delete partialEvidence.customerAccessEligible;
    const missingResultEvidence: Record<string, unknown> =
      validAutomaticGateEvidence();
    delete missingResultEvidence.result;
    const inheritedMandatoryEvidence = Object.assign(
      Object.create({ customerAccessEligible: true }) as Record<string, unknown>,
      validAutomaticGateEvidence(),
    );
    delete inheritedMandatoryEvidence.customerAccessEligible;
    const inheritedResultEvidence = Object.assign(
      Object.create({ result: "passed" }) as Record<string, unknown>,
      validAutomaticGateEvidence(),
    );
    delete inheritedResultEvidence.result;

    const invalidOutputs = [
      {
        name: "missing automatic gate status",
        output: withoutOutputProperty("automatic_gate_status"),
      },
      {
        name: "automatic gate status not passed",
        output: outputRow({ automatic_gate_status: "pending" }),
      },
      {
        name: "null automatic gate status",
        output: outputRow({ automatic_gate_status: null }),
      },
      {
        name: "missing automatic gate policy version",
        output: withoutOutputProperty("automatic_gate_policy_version"),
      },
      {
        name: "null automatic gate policy version",
        output: outputRow({ automatic_gate_policy_version: null }),
      },
      {
        name: "stale automatic gate policy version",
        output: outputRow({
          automatic_gate_policy_version:
            "novora_first_preview_automatic_gates_v0",
        }),
      },
      {
        name: "unknown future automatic gate policy version",
        output: outputRow({
          automatic_gate_policy_version:
            "novora_first_preview_automatic_gates_v999",
        }),
      },
      {
        name: "missing automatic gate evidence",
        output: withoutOutputProperty("automatic_gate_evidence"),
      },
      {
        name: "null automatic gate evidence",
        output: outputRow({ automatic_gate_evidence: null }),
      },
      {
        name: "non-object automatic gate evidence",
        output: outputRow({ automatic_gate_evidence: "passed" }),
      },
      {
        name: "array automatic gate evidence",
        output: outputRow({ automatic_gate_evidence: [] }),
      },
      {
        name: "missing required automatic gate evidence field",
        output: outputRow({ automatic_gate_evidence: partialEvidence }),
      },
      {
        name: "missing automatic gate evidence result",
        output: outputRow({
          automatic_gate_evidence: missingResultEvidence,
        }),
      },
      {
        name: "required automatic gate evidence field inherited",
        output: outputRow({
          automatic_gate_evidence: inheritedMandatoryEvidence,
        }),
      },
      {
        name: "automatic gate evidence result inherited",
        output: outputRow({
          automatic_gate_evidence: inheritedResultEvidence,
        }),
      },
      {
        name: "automatic gate evidence result not passed",
        output: outputRow({
          automatic_gate_evidence: {
            ...validAutomaticGateEvidence(),
            result: "pending",
          },
        }),
      },
      {
        name: "ambiguous automatic gate evidence with an unexpected field",
        output: outputRow({
          automatic_gate_evidence: {
            ...validAutomaticGateEvidence(),
            futureGate: false,
          },
        }),
      },
    ];

    for (const scenario of invalidOutputs) {
      await test.step(scenario.name, async () => {
        const state = harness();
        state.database.outputCandidates = [scenario.output];
        expectOpaqueDenial(await authorize(state));
      });
    }
  });

  test("rejects every false mandatory automatic-gate evidence field", async () => {
    const mandatoryGateFields = [
      "outputValid",
      "assetExists",
      "ownershipConsistent",
      "privacyPassed",
      "customerAccessEligible",
      "lifecycleEligible",
    ] as const;

    for (const field of mandatoryGateFields) {
      for (const invalidValue of [false, 1, "true"] as const) {
        await test.step(`${field}: ${JSON.stringify(invalidValue)}`, async () => {
          const state = harness();
          state.database.outputCandidates = [
            outputRow({
              automatic_gate_evidence: {
                ...validAutomaticGateEvidence(),
                [field]: invalidValue,
              },
            }),
          ];
          expectOpaqueDenial(await authorize(state));
        });
      }
    }
  });

  test("rejects missing, invalid, and inconsistently ordered automatic-gate timestamps", async () => {
    const invalidOutputs = [
      {
        name: "missing automatic gate passed timestamp",
        output: withoutOutputProperty("automatic_gate_passed_at"),
      },
      {
        name: "null automatic gate passed timestamp",
        output: outputRow({ automatic_gate_passed_at: null }),
      },
      {
        name: "invalid automatic gate passed timestamp",
        output: outputRow({ automatic_gate_passed_at: "not-a-time" }),
      },
      {
        name: "automatic gate passed before asset validation",
        output: outputRow({ automatic_gate_passed_at: CREATED_AT }),
      },
      {
        name: "first preview ready before automatic gate passed",
        output: outputRow({ first_preview_ready_at: VALIDATED_AT }),
      },
      {
        name: "automatic gate passed before asset validation within one millisecond",
        output: outputRow({
          asset_validated_at: "2026-07-23T10:00:02.000999Z",
          automatic_gate_passed_at: "2026-07-23T10:00:02.000001Z",
        }),
      },
      {
        name: "first preview ready before automatic gate passage within one millisecond",
        output: outputRow({
          automatic_gate_passed_at: "2026-07-23T10:00:02.000999Z",
          first_preview_ready_at: "2026-07-23T10:00:02.000001Z",
        }),
      },
    ];

    for (const scenario of invalidOutputs) {
      await test.step(scenario.name, async () => {
        const state = harness();
        state.database.outputCandidates = [scenario.output];
        expectOpaqueDenial(await authorize(state), [
          String(scenario.output.automatic_gate_passed_at ?? ""),
          String(scenario.output.first_preview_ready_at ?? ""),
          String(scenario.output.asset_validated_at ?? ""),
        ].filter(Boolean));
      });
    }
  });

  test("rejects noncanonical automatic-gate timestamps even when JavaScript can parse them", async () => {
    for (const invalidTimestamp of [
      "July 23, 2026 10:00:02 GMT",
      "07/23/2026 10:00:02 UTC",
      "2026-07-23 10:00:02Z",
      "2026-07-23T10:00:02",
      "2026-07-23T10:00:02+01:00",
      "2026-07-23T10:00:02.0000001Z",
      "2026-02-30T10:00:02Z",
    ]) {
      await test.step(invalidTimestamp, async () => {
        const state = harness();
        state.database.outputCandidates = [
          outputRow({ automatic_gate_passed_at: invalidTimestamp }),
        ];
        expectOpaqueDenial(await authorize(state), [invalidTimestamp]);
      });
    }
  });

  test("authorizes canonical UTC timestamps with exact microsecond ordering", async () => {
    const validOutputs = [
      {
        name: "canonical Z timestamps",
        output: outputRow({
          asset_validated_at: "2026-07-23T10:00:02Z",
          automatic_gate_passed_at: "2026-07-23T10:00:02.1Z",
          first_preview_ready_at: "2026-07-23T10:00:02.12Z",
        }),
      },
      {
        name: "canonical explicit UTC-offset timestamps",
        output: outputRow({
          asset_validated_at: "2026-07-23T10:00:02+00:00",
          automatic_gate_passed_at: "2026-07-23T10:00:02.1+00:00",
          first_preview_ready_at: "2026-07-23T10:00:02.12+00:00",
        }),
      },
      {
        name: "equal microsecond timestamps",
        output: outputRow({
          asset_validated_at: "2026-07-23T10:00:02.000001Z",
          automatic_gate_passed_at: "2026-07-23T10:00:02.000001Z",
          first_preview_ready_at: "2026-07-23T10:00:02.000001Z",
        }),
      },
      {
        name: "correctly ordered sub-millisecond timestamps",
        output: outputRow({
          asset_validated_at: "2026-07-23T10:00:02.000001Z",
          automatic_gate_passed_at: "2026-07-23T10:00:02.000500Z",
          first_preview_ready_at: "2026-07-23T10:00:02.000999Z",
        }),
      },
    ];

    for (const scenario of validOutputs) {
      await test.step(scenario.name, async () => {
        const state = harness();
        state.database.outputCandidates = [scenario.output];
        expect(await authorize(state)).toMatchObject({ authorized: true });
      });
    }
  });

  test("fails closed without diagnostics for stale gate policy despite otherwise ready/current valid state", async () => {
    const stalePolicyVersion = "novora_first_preview_automatic_gates_v0";
    const state = harness();
    state.database.outputCandidates = [
      outputRow({
        readiness_status: "first_preview_ready",
        is_current_customer_preview: true,
        automatic_gate_policy_version: stalePolicyVersion,
      }),
    ];

    const result = await authorize(state);

    expect(result).toEqual({ authorized: false });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(stalePolicyVersion);
    expect(serialized).not.toContain(
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    );
    expect(serialized).not.toContain("automatic_gate");
    expect(serialized).not.toContain(BRIEF_ID);
    expect(serialized).not.toContain(JOB_ID);
    expect(serialized).not.toContain(OUTPUT_ID);
    expect(serialized).not.toContain("diagnostic");
  });

  test("rejects failed, nonterminal, wrong-purpose, and incorrectly linked Jobs", async () => {
    for (const invalidJob of [
      jobRow({ status: "failed" }),
      jobRow({ status: "processing", completed_at: null }),
      jobRow({ generation_purpose: "regeneration" }),
      jobRow({ concept_brief_id: OTHER_BRIEF_ID }),
      jobRow({ id: OTHER_BRIEF_ID }),
      jobRow({ completed_at: null }),
    ]) {
      const state = harness();
      state.database.jobCandidates = [invalidJob];
      expect(await authorize(state)).toEqual({ authorized: false });
    }
  });

  test("rejects missing or malformed asset metadata, wrong bucket/path, and invalid hashes", async () => {
    for (const invalidOutput of [
      outputRow({ object_path: null }),
      outputRow({ bucket_name: "public-bucket" }),
      outputRow({ object_path: "first-preview/guessed.png" }),
      outputRow({ content_sha256: "not-a-hash" }),
      outputRow({ mime_type: "image/jpeg" }),
      outputRow({ byte_size: 0 }),
      outputRow({ byte_size: 16_777_217 }),
      outputRow({ width_px: 512 }),
      outputRow({ height_px: 512 }),
      outputRow({ asset_validation_status: "failed" }),
      outputRow({ asset_created_at: null }),
      outputRow({ asset_validated_at: "not-a-time" }),
      outputRow({ first_preview_ready_at: null }),
    ]) {
      const state = harness();
      state.database.outputCandidates = [invalidOutput];
      expect(await authorize(state)).toEqual({ authorized: false });
    }
  });

  test("normalizes returned database errors and thrown exceptions without raw-error leakage", async () => {
    for (const operation of ["brief", "output", "job"] as const) {
      const returned = harness();
      returned.database.failNext(operation);
      const returnedResult = await authorize(returned);
      expect(returnedResult).toEqual({ authorized: false });

      const thrown = harness();
      thrown.database.throwNext(operation);
      const thrownResult = await authorize(thrown);
      expect(thrownResult).toEqual({ authorized: false });

      for (const result of [returnedResult, thrownResult]) {
        const serialized = JSON.stringify(result);
        expect(serialized).not.toContain("synthetic");
        expect(serialized).not.toContain(SECRET);
        expect(serialized).not.toContain(HASH);
        expect(serialized).not.toContain(outputRow().object_path);
      }
    }
  });

  test("returns an unavailable authorizer when the secret or database/admin dependency is absent", async () => {
    const database = new FakeFirstPreviewCustomerAccessDatabaseClient();
    for (const authorizer of [
      createFirstPreviewCustomerAccessAuthorizerBinding({
        databaseClient: database,
        signingSecret: null,
      }),
      createFirstPreviewCustomerAccessAuthorizerBinding({
        databaseClient: null,
        signingSecret: SECRET,
      }),
    ]) {
      expect(authorizer.kind).toBe("unavailable");
      expect(
        await authorizer.authorize({
          publicReference: PUBLIC_REFERENCE,
          outputId: OUTPUT_ID,
          accessProof: validProof(),
        }),
      ).toEqual({ authorized: false });
    }
    expect(database.requests).toEqual([]);
  });
});
