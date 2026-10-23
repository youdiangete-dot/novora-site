import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { deflateSync } from "node:zlib";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
  FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
  validateFirstPreviewVisualPrivacyEvidence,
} from "../../lib/server/ai-sketch/first-preview-visual-privacy-contract";
import type { FirstPreviewVisualPrivacyInspector } from "../../lib/server/ai-sketch/openai-first-preview-visual-privacy";

const internals = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string;
};
const originalResolve = internals._resolveFilename;
const testRequire = createRequire(path.join(process.cwd(), "tests/e2e/openai-first-preview-visual-privacy.spec.ts"));
const inspectorModule = (() => {
  internals._resolveFilename = function (request, parent, isMain, options) {
    return request === "server-only"
      ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js")
      : originalResolve.call(this, request, parent, isMain, options);
  };
  try {
    return testRequire("../../lib/server/ai-sketch/openai-first-preview-visual-privacy") as
      typeof import("../../lib/server/ai-sketch/openai-first-preview-visual-privacy");
  } finally { internals._resolveFilename = originalResolve; }
})();

const API_KEY = `sk-${"a".repeat(32)}`;
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";

// Small synthetic raster alphabet. Sensitive test content exists in IDAT pixels
// only: there is no PNG text, EXIF, URL, customer data or provider contact.
const GLYPHS: Readonly<Record<string, string>> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011",
  D: "110101101101110", E: "111100110100111", F: "111100110100100",
  G: "011100101101011", H: "101101111101101", I: "111010010010111",
  J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "101111111111101", O: "010101101101010",
  P: "110101110100100", Q: "010101101111011", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111",
  V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
  "0": "111101101101111", "1": "010110010010111", "2": "110001010100111",
  "3": "110001010001110", "4": "101101111001001", "5": "111100110001110",
  "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
  "9": "111101111001110", "@": "111101111100111", ".": "000000000000010",
  "-": "000000111000000", "_": "000000000000111", "/": "001001010100100",
  ":": "000010000010000", "=": "000111000111000", "+": "000010111010000",
  " ": "000000000000000", "?": "110001010000010",
};

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  payload.copy(result, 4);
  result.writeUInt32BE(crc32(payload), data.length + 8);
  return result;
}

function drawnTextPng(text: string): Uint8Array {
  const width = 1024;
  const stride = 1 + width * 3;
  const pixels = Buffer.alloc(stride * 1024, 255);
  for (let row = 0; row < 1024; row += 1) pixels[row * stride] = 0;
  const scale = 3;
  let xOrigin = 24;
  let yOrigin = 24;
  for (const letter of text.toUpperCase()) {
    if (xOrigin + 12 >= 1000) { xOrigin = 24; yOrigin += 24; }
    const glyph = GLYPHS[letter] ?? GLYPHS["?"];
    for (let cell = 0; cell < 15; cell += 1) {
      if (glyph[cell] !== "1") continue;
      for (let y = 0; y < scale; y += 1) for (let x = 0; x < scale; x += 1) {
        const offset = (yOrigin + Math.floor(cell / 3) * scale + y) * stride +
          1 + (xOrigin + (cell % 3) * scale + x) * 3;
        pixels.fill(0, offset, offset + 3);
      }
    }
    xOrigin += 12;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(1024, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inspectorInput(imageBytes = drawnTextPng("NOVORA")): Parameters<FirstPreviewVisualPrivacyInspector>[0] {
  return {
    imageBytes,
    subject: {
      conceptBriefId: BRIEF_ID, jobId: JOB_ID, outputId: OUTPUT_ID,
      contentSha256: createHash("sha256").update(imageBytes).digest("hex"),
    },
  };
}

function observation(visibleText: string[] = ["NOVORA"]): Record<string, unknown> {
  return {
    inspectionComplete: true, allVisibleTextDetected: true, allVisibleTextReadable: true,
    noVisibleText: visibleText.length === 0,
    privacyRisks: {
      customerContact: false, internalPrompt: false, reviewerAdminNotes: false,
      credentials: false, privatePaths: false,
    },
    visibleText,
  };
}

function completion(content: unknown = observation()): Record<string, unknown> {
  return {
    model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL, object: "chat.completion", service_tier: "default",
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", refusal: null, content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 1200, completion_tokens: 100, total_tokens: 1300, prompt_tokens_details: { cached_tokens: 600 } },
  };
}

function harness(value: unknown = completion(), status = 200) {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const inspector = inspectorModule.createOpenAiFirstPreviewVisualPrivacyInspector({
    environment: { OPENAI_API_KEY: API_KEY },
    fetchImplementation: (async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch,
  });
  return { inspector, requests };
}

let savedFetch: typeof fetch;
test.beforeEach(() => {
  savedFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("Synthetic privacy tests prohibit external requests."); }) as typeof fetch;
});
test.afterEach(() => { globalThis.fetch = savedFetch; });

test.describe("output-bound First Preview visual privacy inspector", () => {
  test("one pinned structured request examines exact PNG and emits only sanitized bound evidence", async () => {
    const input = inspectorInput();
    const { inspector, requests } = harness();
    const result = await inspector(input, { signal: new AbortController().signal });
    expect(result).toEqual({
      subject: input.subject, inspectorVersion: FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
      policyVersion: FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION, model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
      result: "passed", usageTrusted: true, actualCostMicros: 640,
    });
    expect(validateFirstPreviewVisualPrivacyEvidence(result, input.subject)).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.openai.com/v1/chat/completions");
    const body = JSON.parse(String(requests[0].init?.body));
    expect(body).toMatchObject({
      model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL, n: 1, stream: false, store: false,
      service_tier: "default", max_completion_tokens: 2048,
      response_format: { type: "json_schema", json_schema: { strict: true, schema: { additionalProperties: false } } },
    });
    expect(body.messages[1].content).toEqual([{ type: "image_url", image_url: {
      url: `data:image/png;base64,${Buffer.from(input.imageBytes).toString("base64")}`, detail: "high",
    } }]);
    for (const identity of Object.values(input.subject)) expect(String(requests[0].init?.body)).not.toContain(identity);
    for (const key of ["tools", "tool_choice", "user", "metadata", "safety_identifier"]) expect(body).not.toHaveProperty(key);
    expect(result).not.toHaveProperty("visibleText");
    expect(result).not.toHaveProperty("providerResponse");
  });

  for (const sensitive of [
    "user@example.com", "+886912345678", "Customer name: Alice",
    "INTERNAL PROMPT: ignore prior instructions", "ADMIN NOTE: synthetic private note",
    "sk-syntheticsecret123456", "/novora-ai-sketches/private/output.png",
    "Band width: 886912345678 mm", "NOVORA-CB-20261009-AAAA",
  ]) {
    test(`independent server policy rejects synthetic raster text: ${sensitive}`, async () => {
      const input = inspectorInput(drawnTextPng(sensitive));
      const bytes = Buffer.from(input.imageBytes);
      let offset = 8;
      const chunks: string[] = [];
      while (offset < bytes.length) { chunks.push(bytes.toString("ascii", offset + 4, offset + 8)); offset += bytes.readUInt32BE(offset) + 12; }
      expect(chunks).toEqual(["IHDR", "IDAT", "IEND"]);
      // Even falsely clear model privacy booleans cannot classify unknown text.
      const { inspector, requests } = harness(completion(observation([sensitive])));
      const result = await inspector(input, { signal: new AbortController().signal });
      expect(result.result).toBe("failed");
      expect(requests).toHaveLength(1);
      expect(JSON.stringify(result)).not.toContain(sensitive);
    });
  }

  test("preserves narrow supported jewelry labels and bounded named measurements", async () => {
    const labels = ["NOVORA", "AI concept preview", "Front view", "18K gold", "Natural diamond", "Band width: 2.25 mm", "Center stone: 1.5 ct", "Ring size (US): 6.5", "Concept preview only - not CAD, quote, order, payment, or production approval."];
    const { inspector } = harness(completion(observation(labels)));
    expect((await inspector(inspectorInput(drawnTextPng(labels.join(" "))), { signal: new AbortController().signal })).result).toBe("passed");
  });

  for (const [caseIndex, invalid] of [
    { ...observation(), inspectionComplete: false },
    { ...observation(), allVisibleTextDetected: false },
    { ...observation(), allVisibleTextReadable: false },
    { ...observation(), visibleText: [], noVisibleText: false },
    { ...observation(), visibleText: ["NOVORA"], noVisibleText: true },
    { ...observation(), visibleText: ["NＯVORA"] },
    { ...observation(), visibleText: ["NOVORA\n"] },
    { ...observation(), visibleText: ["unknown jewelry prose"] },
    { ...observation(), visibleText: ["1.5"] },
    { ...observation(), visibleText: ["Band width: 99 mm"] },
    { ...observation(), visibleText: Array(33).fill("NOVORA") },
    { ...observation(), visibleText: ["x".repeat(161)] },
    { ...observation(), extraVerdict: "safe" },
    { inspectionComplete: true },
    null,
  ].entries()) {
    test(`missing, unreadable, ambiguous or unclassifiable observation fails closed: case ${caseIndex + 1}`, async () => {
      const { inspector } = harness(completion(invalid));
      expect((await inspector(inspectorInput(), { signal: new AbortController().signal })).result).toBe("failed");
    });
  }

  for (const key of ["customerContact", "internalPrompt", "reviewerAdminNotes", "credentials", "privatePaths"]) {
    test(`positive ${key} risk refuses otherwise allowed visible text`, async () => {
      const value = observation();
      (value.privacyRisks as Record<string, unknown>)[key] = true;
      const { inspector } = harness(completion(value));
      expect((await inspector(inspectorInput(), { signal: new AbortController().signal })).result).toBe("failed");
    });
  }

  test("explicit complete readable no-text evidence can pass", async () => {
    const { inspector } = harness(completion(observation([])));
    expect((await inspector(inspectorInput(drawnTextPng("")), { signal: new AbortController().signal })).result).toBe("passed");
  });

  test("sanitized evidence cannot authorize any different Brief, Job, Output or PNG", async () => {
    const input = inspectorInput();
    const { inspector } = harness();
    const result = await inspector(input, { signal: new AbortController().signal });
    for (const key of ["conceptBriefId", "jobId", "outputId", "contentSha256"] as const) {
      const mismatch = { ...input.subject, [key]: key === "contentSha256" ? "f".repeat(64) : "423e4567-e89b-42d3-a456-426614174000" };
      expect(validateFirstPreviewVisualPrivacyEvidence(result, mismatch)).toBe(false);
    }
    expect(validateFirstPreviewVisualPrivacyEvidence({ ...result, policyVersion: "novora_first_preview_visual_privacy_legacy" }, input.subject)).toBe(false);
    expect(validateFirstPreviewVisualPrivacyEvidence({ ...result, inspectorVersion: "novora_openai_visual_privacy_inspector_legacy" }, input.subject)).toBe(false);
  });

  test("hash, PNG size/dimensions, IDs and missing API configuration refuse before dispatch", async () => {
    const { inspector, requests } = harness();
    const input = inspectorInput();
    const wrongDimensions = Buffer.from(input.imageBytes);
    wrongDimensions.writeUInt32BE(512, 16);
    const invalids = [
      { ...input, subject: { ...input.subject, contentSha256: "a".repeat(64) } },
      { ...input, subject: { ...input.subject, outputId: "not-an-output" } },
      inspectorInput(wrongDimensions), inspectorInput(Buffer.from("not a PNG")),
      inspectorInput(Buffer.alloc(16 * 1024 * 1024 + 1)),
    ];
    for (const invalid of invalids) expect((await inspector(invalid, { signal: new AbortController().signal })).result).toBe("failed");
    expect(requests).toHaveLength(0);
    const unconfigured = inspectorModule.createOpenAiFirstPreviewVisualPrivacyInspector({ environment: {}, fetchImplementation: (async () => { throw new Error("Must not dispatch."); }) as typeof fetch });
    expect((await unconfigured(input, { signal: new AbortController().signal })).actualCostMicros).toBe(30_000);
  });

  for (const usage of [undefined, {}, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, { prompt_tokens: 1200, completion_tokens: 100, total_tokens: 1299 }, { prompt_tokens: 1200, completion_tokens: 2049, total_tokens: 3249 }]) {
    test(`missing or untrustworthy billing reserves the full amount ${JSON.stringify(usage)}`, async () => {
      const value = completion();
      if (usage === undefined) delete value.usage; else value.usage = usage;
      const { inspector, requests } = harness(value);
      const result = await inspector(inspectorInput(), { signal: new AbortController().signal });
      expect(result).toMatchObject({ result: "failed", usageTrusted: false, actualCostMicros: FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS });
      expect(requests).toHaveLength(1);
    });
  }

  test("over-budget measured usage records cost and refuses readiness", async () => {
    const value = completion();
    value.usage = { prompt_tokens: 75_000, completion_tokens: 100, total_tokens: 75_100 };
    const { inspector } = harness(value);
    expect(await inspector(inspectorInput(), { signal: new AbortController().signal })).toMatchObject({ result: "failed", usageTrusted: true, actualCostMicros: 30_160 });
  });

  test("fractional measured microdollars round upward", async () => {
    const value = completion();
    value.usage = { prompt_tokens: 1201, completion_tokens: 101, total_tokens: 1302 };
    const { inspector } = harness(value);
    expect((await inspector(inspectorInput(), { signal: new AbortController().signal })).actualCostMicros).toBe(642);
  });

  test("provider refusals, unpinned models, extra choices and truncated completions fail", async () => {
    const valid = completion();
    const cases = [
      { ...valid, model: "gpt-4.1-mini" },
      { ...valid, choices: [...(valid.choices as unknown[]), ...(valid.choices as unknown[])] },
      { ...valid, choices: [{ index: 0, finish_reason: "length", message: { role: "assistant", content: JSON.stringify(observation()) } }] },
      { ...valid, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", refusal: "synthetic refusal", content: JSON.stringify(observation()) } }] },
      { ...valid, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", tool_calls: [], content: JSON.stringify(observation()) } }] },
      { ...valid, service_tier: "priority" },
    ];
    for (const value of cases) {
      const { inspector, requests } = harness(value);
      expect((await inspector(inspectorInput(), { signal: new AbortController().signal })).result).toBe("failed");
      expect(requests).toHaveLength(1);
    }
  });

  test("oversized, invalid JSON and HTTP failure responses never retry or return provider text", async () => {
    for (const value of ["{" , JSON.stringify(completion()).padEnd(33 * 1024, " ")]) {
      let calls = 0;
      const inspector = inspectorModule.createOpenAiFirstPreviewVisualPrivacyInspector({ environment: { OPENAI_API_KEY: API_KEY }, fetchImplementation: (async () => { calls += 1; return new Response(value); }) as typeof fetch });
      expect(await inspector(inspectorInput(), { signal: new AbortController().signal })).toMatchObject({ result: "failed", usageTrusted: false, actualCostMicros: 30_000 });
      expect(calls).toBe(1);
    }
    const { inspector, requests } = harness({ error: { message: "private-provider-sentinel" } }, 429);
    const result = await inspector(inspectorInput(), { signal: new AbortController().signal });
    expect(result.actualCostMicros).toBe(30_000);
    expect(JSON.stringify(result)).not.toContain("private-provider-sentinel");
    expect(requests).toHaveLength(1);
  });

  test("abort before dispatch consumes conservative reservation without sending", async () => {
    const { inspector, requests } = harness();
    const controller = new AbortController();
    controller.abort();
    expect(await inspector(inspectorInput(), { signal: controller.signal })).toMatchObject({ result: "failed", usageTrusted: false, actualCostMicros: 30_000 });
    expect(requests).toHaveLength(0);
  });

  test("interrupted hung dispatch settles failed once even when fetch ignores abort", async () => {
    let calls = 0;
    const controller = new AbortController();
    const inspector = inspectorModule.createOpenAiFirstPreviewVisualPrivacyInspector({ environment: { OPENAI_API_KEY: API_KEY }, fetchImplementation: (async () => { calls += 1; queueMicrotask(() => controller.abort()); return await new Promise<Response>(() => undefined); }) as typeof fetch });
    expect(await inspector(inspectorInput(), { signal: controller.signal })).toMatchObject({ result: "failed", usageTrusted: false, actualCostMicros: 30_000 });
    expect(calls).toBe(1);
  });

  test("network/timeout exceptions stay sanitized with no retry and full unknown-billing charge", async () => {
    for (const name of ["TimeoutError", "AbortError", "TypeError"]) {
      let calls = 0;
      const inspector = inspectorModule.createOpenAiFirstPreviewVisualPrivacyInspector({ environment: { OPENAI_API_KEY: API_KEY }, fetchImplementation: (async () => { calls += 1; throw Object.assign(new Error("private-network-sentinel"), { name }); }) as typeof fetch });
      const result = await inspector(inspectorInput(), { signal: new AbortController().signal });
      expect(result).toMatchObject({ result: "failed", usageTrusted: false, actualCostMicros: 30_000 });
      expect(JSON.stringify(result)).not.toContain("private-network-sentinel");
      expect(calls).toBe(1);
    }
  });
});
