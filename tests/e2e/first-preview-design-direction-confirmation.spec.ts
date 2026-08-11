import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

const internals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const shim = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);
const original = internals._resolveFilename;
internals._resolveFilename = function (request, parent, isMain, options) {
  return request === "server-only"
    ? shim
    : original.call(this, request, parent, isMain, options);
};
const testRequire = createRequire(
  path.join(
    process.cwd(),
    "tests",
    "e2e",
    "first-preview-design-direction-confirmation.spec.ts",
  ),
);
const confirmationModule = testRequire(
  "../../lib/server/ai-sketch/first-preview-customer-design-confirmation",
) as typeof import("../../lib/server/ai-sketch/first-preview-customer-design-confirmation");
const feedbackModule = testRequire(
  "../../lib/server/ai-sketch/first-preview-customer-feedback",
) as typeof import("../../lib/server/ai-sketch/first-preview-customer-feedback");
internals._resolveFilename = original;

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20260810-M341";
const OTHER_REFERENCE = "NOVORA-CB-20260810-M342";
const SIGNING_SECRET = "m3-4-design-confirmation-test-secret-20260810";

type ViewState = "ready" | "pending" | "unavailable" | "denied";

function confirmationBody(
  outputId = OUTPUT_ID,
  publicReference = REFERENCE,
) {
  const binding =
    confirmationModule.createFirstPreviewCustomerDesignConfirmationBinding(
      { publicReference, outputId },
      SIGNING_SECRET,
    );
  if (!binding) throw new Error("Expected a valid confirmation binding fixture.");
  return { binding };
}

function dependencies(
  input: {
    viewStates?: readonly ViewState[];
    viewOutputIds?: readonly string[];
    pair?: "exact" | "missing" | "wrong";
    insert?: "inserted" | "already_confirmed" | "unavailable";
    signingSecret?: string;
  } = {},
) {
  const writes: unknown[] = [];
  const resolutions: unknown[] = [];
  const views: unknown[] = [];
  let viewIndex = 0;
  return {
    writes,
    resolutions,
    views,
    value: {
      readCustomerView: async (request: { publicReference: string }) => {
        views.push(request);
        const index = Math.min(
          viewIndex,
          Math.max((input.viewStates?.length ?? 1) - 1, 0),
        );
        const state = input.viewStates?.[index] ?? "ready";
        const outputId =
          input.viewOutputIds?.[
            Math.min(
              viewIndex,
              Math.max((input.viewOutputIds?.length ?? 1) - 1, 0),
            )
          ] ?? OUTPUT_ID;
        viewIndex += 1;
        if (state === "ready") {
          return {
            state: "ready" as const,
            assetRequest: { publicReference: REFERENCE, outputId },
          };
        }
        if (state === "pending") {
          return { state: "pending" as const, pollAfterMs: 5_000 as const };
        }
        return { state };
      },
      repository: {
        async resolveExactCurrentPair(
          publicReference: string,
          outputId: string,
        ) {
          resolutions.push({ publicReference, outputId });
          if (input.pair === "missing") return null;
          return {
            conceptBriefId: BRIEF_ID,
            outputId: input.pair === "wrong" ? OTHER_OUTPUT_ID : OUTPUT_ID,
          };
        },
        async insertExactConfirmation(value: unknown) {
          writes.push(value);
          return input.insert ?? "inserted";
        },
      },
      signingSecret: input.signingSecret ?? SIGNING_SECRET,
    },
  };
}

test("creates a distinct canonical exact-output confirmation binding", () => {
  const binding = confirmationBody().binding;
  expect(
    confirmationModule.verifyFirstPreviewCustomerDesignConfirmationBinding(
      binding,
      SIGNING_SECRET,
    ),
  ).toEqual({
    v: 1,
    alg: "HS256",
    aud: "novora:first-preview-design-direction-confirmation",
    purpose: "selected-design-direction-confirmation",
    publicReference: REFERENCE,
    outputId: OUTPUT_ID,
  });

  const feedbackBinding = feedbackModule.createFirstPreviewCustomerFeedbackBinding(
    { publicReference: REFERENCE, outputId: OUTPUT_ID },
    SIGNING_SECRET,
  );
  expect(feedbackBinding).not.toBeNull();
  expect(
    feedbackModule.verifyFirstPreviewCustomerFeedbackBinding(
      binding,
      SIGNING_SECRET,
    ),
  ).toBeNull();
  expect(
    confirmationModule.verifyFirstPreviewCustomerDesignConfirmationBinding(
      feedbackBinding,
      SIGNING_SECRET,
    ),
  ).toBeNull();
});

test("confirms only the exact ready current output after a final trusted-view check", async () => {
  const setup = dependencies();
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(),
      setup.value,
    ),
  ).resolves.toEqual({ ok: true, status: "created" });
  expect(setup.views).toEqual([
    { publicReference: REFERENCE },
    { publicReference: REFERENCE },
  ]);
  expect(setup.resolutions).toEqual([
    { publicReference: REFERENCE, outputId: OUTPUT_ID },
  ]);
  expect(setup.writes).toEqual([
    {
      conceptBriefId: BRIEF_ID,
      outputId: OUTPUT_ID,
      confirmationVersion: "customer_design_direction_confirmation_v1",
    },
  ]);
});

test("same exact output confirmation is idempotent and preserves later-output history", async () => {
  const repeated = dependencies({ insert: "already_confirmed" });
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(),
      repeated.value,
    ),
  ).resolves.toEqual({ ok: true, status: "already_confirmed" });
  expect(repeated.writes).toHaveLength(1);

  const source = readFileSync(
    path.join(
      process.cwd(),
      "docs",
      "novora-m3-4-design-direction-confirmation-candidate.sql",
    ),
    "utf8",
  );
  expect(source).toContain("UNIQUE (concept_brief_id, ai_sketch_output_id)");
  expect(source).not.toContain("UPDATE public.first_preview_design_direction_confirmations");
  expect(source).not.toContain("DELETE FROM public.first_preview_design_direction_confirmations");
});

test("wrong public reference, wrong signed output, forged binding, and missing secret fail closed", async () => {
  const wrongReference = dependencies();
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(OUTPUT_ID, OTHER_REFERENCE),
      wrongReference.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "denied" });

  const wrongOutput = dependencies();
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(OTHER_OUTPUT_ID),
      wrongOutput.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "unavailable" });

  const forged = dependencies();
  const binding = confirmationBody().binding;
  const forgedBinding = `${binding.slice(0, -1)}${binding.endsWith("A") ? "B" : "A"}`;
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      { binding: forgedBinding },
      forged.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "invalid" });

  const noSecret = dependencies({ signingSecret: "" });
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(),
      noSecret.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "unavailable" });
  for (const setup of [wrongReference, wrongOutput, forged, noSecret]) {
    expect(setup.writes).toHaveLength(0);
  }
});

test("stale, non-current, revoked, and changed-after-resolution output states fail closed", async () => {
  for (const unavailablePair of ["stale", "non-current", "revoked"] as const) {
    const setup = dependencies({ pair: "missing" });
    await expect(
      confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
        REFERENCE,
        confirmationBody(),
        setup.value,
      ),
      unavailablePair,
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(setup.writes).toHaveLength(0);
  }

  const changed = dependencies({
    viewOutputIds: [OUTPUT_ID, OTHER_OUTPUT_ID],
  });
  await expect(
    confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
      REFERENCE,
      confirmationBody(),
      changed.value,
    ),
  ).resolves.toEqual({ ok: false, reason: "unavailable" });
  expect(changed.writes).toHaveLength(0);

  const serverSource = readFileSync(
    path.join(
      process.cwd(),
      "lib",
      "server",
      "ai-sketch",
      "first-preview-customer-design-confirmation.ts",
    ),
    "utf8",
  );
  expect(serverSource).toContain('.eq("readiness_status", "first_preview_ready")');
  expect(serverSource).toContain('.eq("is_current_customer_preview", true)');
  expect(serverSource).toContain('.is("readiness_revoked_at", null)');
});

test("pending, unavailable, and denied trusted customer views fail closed", async () => {
  for (const state of ["pending", "unavailable", "denied"] as const) {
    const setup = dependencies({ viewStates: [state] });
    const result =
      await confirmationModule.persistFirstPreviewCustomerDesignConfirmation(
        REFERENCE,
        confirmationBody(),
        setup.value,
      );
    expect(result.ok).toBe(false);
    expect(setup.resolutions).toHaveLength(0);
    expect(setup.writes).toHaveLength(0);
  }
});

test("confirmation mutates only append-only confirmation evidence", () => {
  const serverSource = readFileSync(
    path.join(
      process.cwd(),
      "lib",
      "server",
      "ai-sketch",
      "first-preview-customer-design-confirmation.ts",
    ),
    "utf8",
  );
  expect(serverSource).toContain(
    '.from("first_preview_design_direction_confirmations")',
  );
  expect(serverSource).not.toContain("first_preview_customer_feedback");
  expect(serverSource).not.toContain("ai_sketch_reviews");
  expect(serverSource).not.toContain("ai_sketch_jobs");
  expect(serverSource).not.toContain('.from("ai_sketch_outputs").update');
  expect(serverSource).not.toContain("readiness_status:");
  expect(serverSource).not.toContain("is_current_customer_preview:");
  expect(serverSource).not.toContain("job_state");
});

test("customer confirmation copy preserves every commercial boundary and feedback stays independent", () => {
  const pageSource = readFileSync(
    path.join(
      process.cwd(),
      "app",
      "design",
      "preview",
      "[public_reference]",
      "page.tsx",
    ),
    "utf8",
  );
  const confirmationSource = readFileSync(
    path.join(
      process.cwd(),
      "app",
      "design",
      "preview",
      "[public_reference]",
      "FirstPreviewDesignConfirmation.tsx",
    ),
    "utf8",
  );
  const feedbackSource = readFileSync(
    path.join(
      process.cwd(),
      "app",
      "design",
      "preview",
      "[public_reference]",
      "FirstPreviewFeedbackForm.tsx",
    ),
    "utf8",
  );
  expect(pageSource).toContain(
    "createFirstPreviewCustomerDesignConfirmationBinding",
  );
  expect(pageSource).toContain(
    "createFirstPreviewCustomerFeedbackBinding",
  );
  expect(pageSource).toContain("confirmationBinding={confirmationBinding}");
  expect(pageSource).toContain("feedbackBinding={feedbackBinding}");
  expect(confirmationSource).toContain("Confirm this design direction");
  for (const boundary of ["CAD", "quotation", "payment", "order", "production"]) {
    expect(confirmationSource.toLowerCase()).toContain(boundary.toLowerCase());
  }
  expect(confirmationSource).toContain("gemstone, material, size");
  expect(confirmationSource).toContain("Refinement may still occur");
  expect(confirmationSource).toContain("JSON.stringify({ binding: confirmationBinding })");
  expect(confirmationSource).not.toContain("feedbackBinding");
  expect(feedbackSource).toContain("Submit feedback");
  expect(feedbackSource).not.toContain("confirmationBinding");
});

test("API source returns only the locked confirmation statuses without internal IDs", () => {
  const routeSource = readFileSync(
    path.join(
      process.cwd(),
      "app",
      "api",
      "first-preview-design-confirmation",
      "[public_reference]",
      "route.ts",
    ),
    "utf8",
  );
  expect(routeSource).toContain("status: alreadyConfirmed ? 200 : 201");
  expect(routeSource).toContain("{ status: 400 }");
  expect(routeSource).toContain("{ status: 403 }");
  expect(routeSource).toContain("{ status: 409 }");
  expect(routeSource).not.toContain("conceptBriefId");
  expect(routeSource).not.toContain("outputId");
});
