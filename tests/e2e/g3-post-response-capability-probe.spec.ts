import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import * as probeRoute from "../../app/api/internal/g3-post-response-capability-probe/route";
import type { G3PostResponseProbeMarker } from "../../app/api/internal/g3-post-response-capability-probe/route";

type ScheduledTask = () => void | Promise<void>;

function createHarness(runtimeEnvironment = "preview") {
  let now = 0;
  const scheduledTasks: ScheduledTask[] = [];
  const sleepCalls: number[] = [];
  const markers: G3PostResponseProbeMarker[] = [];
  const post = probeRoute.POST.createTestHandler({
    runtimeEnvironment,
    clock: () => now,
    sleep: async (durationMs) => {
      sleepCalls.push(durationMs);
      now += durationMs;
    },
    schedule: (task) => {
      scheduledTasks.push(task);
    },
    correlationIdSource: () => "g3_synthetic_correlation_001",
    emitMarker: (marker) => {
      markers.push(marker);
    },
  });

  return {
    post,
    scheduledTasks,
    sleepCalls,
    markers,
    advanceClock(durationMs: number) {
      now += durationMs;
    },
  };
}

const routeSource = readFileSync(
  path.join(
    process.cwd(),
    "app",
    "api",
    "internal",
    "g3-post-response-capability-probe",
    "route.ts",
  ),
  "utf8",
);

test.describe("isolated G3 post-response capability probe", () => {
  test("is POST-only, Preview-only, and exports the exact duration contract", async () => {
    expect(probeRoute.maxDuration).toBe(300);
    expect(typeof probeRoute.POST).toBe("function");
    for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      expect(method in probeRoute).toBe(false);
      expect(routeSource).not.toMatch(
        new RegExp(`export\\s+(?:const|function)\\s+${method}\\b`),
      );
    }

    for (const runtimeEnvironment of [
      "production",
      "development",
      "Preview",
      "",
    ]) {
      const harness = createHarness(runtimeEnvironment);
      const response = await harness.post();
      expect(response.status).toBe(404);
      expect(harness.scheduledTasks).toHaveLength(0);
      expect(harness.sleepCalls).toEqual([]);
      expect(harness.markers.map((marker) => marker.event)).toEqual([
        "function_entry",
        "bounded_failure",
      ]);
      expect(harness.markers.at(-1)?.boundedOutcome).toBe(
        "runtime_not_preview",
      );
    }
  });

  test("uses the exact approved phases and returns before callback completion", async () => {
    expect(probeRoute.POST.probePlan).toEqual({
      version: "g3-post-response-capability-probe-v1",
      phaseDurationsMs: {
        preRegistrationSyntheticWait: 10_000,
        postRegistrationResponsePathWait: 5_000,
        callbackPreProviderEquivalentWait: 25_000,
        providerEquivalentSyntheticWait: 150_000,
        callbackPostProviderEquivalentWait: 25_000,
      },
      phaseCapsMs: {
        requestEntryToRegistrationMarker: 15_000,
        registrationMarkerToCallbackStart: 15_000,
        callbackPreProviderEquivalent: 30_000,
        providerEquivalent: 150_000,
        callbackPostProviderEquivalent: 30_000,
        totalInvocationPassBoundary: 240_000,
        shutdownSafetyBoundary: 270_000,
      },
      maxDurationMs: 300_000,
    });

    const harness = createHarness();
    const response = await harness.post();
    expect(response.status).toBe(201);
    expect(harness.scheduledTasks).toHaveLength(1);
    expect(harness.sleepCalls).toEqual([10_000, 5_000]);
    expect(harness.markers.map((marker) => marker.event)).toEqual([
      "function_entry",
      "callback_registered",
      "response_returning",
    ]);
    expect(harness.markers.some((marker) => marker.event === "callback_completed"))
      .toBe(false);

    await harness.scheduledTasks[0]();
    expect(harness.sleepCalls).toEqual([
      10_000,
      5_000,
      25_000,
      150_000,
      25_000,
    ]);
    expect(harness.markers.map((marker) => marker.event)).toEqual([
      "function_entry",
      "callback_registered",
      "response_returning",
      "callback_started",
      "pre_provider_complete",
      "provider_equivalent_complete",
      "callback_completed",
    ]);
    expect(harness.markers.map((marker) => marker.elapsedMs)).toEqual([
      0,
      10_000,
      15_000,
      15_000,
      40_000,
      190_000,
      215_000,
    ]);
    expect(harness.markers.at(-1)).toMatchObject({
      boundedOutcome: "pass",
      booleanState: {
        callbackRegistered: true,
        callbackClaimed: true,
        preProviderComplete: true,
        providerEquivalentComplete: true,
        postProviderComplete: true,
      },
    });
  });

  test("fails a late callback without compressing or starting later phases", async () => {
    const harness = createHarness();
    expect((await harness.post()).status).toBe(201);
    harness.advanceClock(10_001);

    await harness.scheduledTasks[0]();
    expect(harness.sleepCalls).toEqual([10_000, 5_000]);
    expect(harness.markers.map((marker) => marker.event)).toEqual([
      "function_entry",
      "callback_registered",
      "response_returning",
      "bounded_failure",
    ]);
    expect(harness.markers.at(-1)?.boundedOutcome).toBe(
      "callback_start_deadline_exceeded",
    );
  });

  test("a duplicate callback execution cannot emit PASS", async () => {
    const harness = createHarness();
    expect((await harness.post()).status).toBe(201);

    await Promise.all([
      harness.scheduledTasks[0](),
      harness.scheduledTasks[0](),
    ]);
    expect(harness.markers.filter((marker) => marker.event === "bounded_failure"))
      .toHaveLength(1);
    expect(harness.markers.at(-1)?.boundedOutcome).toBe(
      "duplicate_callback_execution",
    );
    expect(harness.markers.some((marker) => marker.boundedOutcome === "pass"))
      .toBe(false);
  });

  test("ignores arguments, reads no body, and uses no customer cookie mechanism", async () => {
    const harness = createHarness();
    expect(harness.post.length).toBe(0);
    const hostileInput = new Request("http://invalid.local/ignored", {
      method: "POST",
      headers: {
        cookie: "irrelevant=forbidden-input-sentinel",
        "x-forbidden-input": "forbidden-input-sentinel",
      },
      body: JSON.stringify({ ignored: "forbidden-input-sentinel" }),
    });
    const response = await (
      harness.post as unknown as (...arguments_: unknown[]) => Promise<Response>
    )(hostileInput, { ignored: "forbidden-input-sentinel" });
    const body = await response.json();
    const serialized = JSON.stringify({ body, markers: harness.markers });

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(serialized).not.toContain("forbidden-input-sentinel");
    expect(routeSource).not.toMatch(
      /\brequest\.(?:json|text|arrayBuffer|formData|headers|cookies)\b/i,
    );
    expect(routeSource).not.toMatch(/set-cookie|\.cookies\b/i);
  });

  test("has one framework import and no reachable external or business side effect", async () => {
    const imports = routeSource.match(/^import\s+.+;$/gm) ?? [];
    expect(imports).toEqual(['import { after } from "next/server";']);
    for (const prohibitedCall of [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bcreateClient\s*\(/,
      /\.from\s*\(/,
      /\.upload\s*\(/,
      /\.send\s*\(/,
    ]) {
      expect(routeSource).not.toMatch(prohibitedCall);
    }

    const normalizedImport = imports.join("\n").toLowerCase();
    for (const prohibitedImport of [
      "openai",
      "supabase",
      "storage",
      "email",
      "notification",
      "persistence",
      "rate-limit",
      "repository",
      "concept-brief",
      "first-preview",
    ]) {
      expect(normalizedImport).not.toContain(prohibitedImport);
    }

    const harness = createHarness();
    const response = await harness.post();
    await harness.scheduledTasks[0]();
    const serialized = JSON.stringify({
      response: await response.json(),
      markers: harness.markers,
    });
    for (const prohibitedField of [
      "publicReference",
      "conceptBriefId",
      "outputId",
      "jobId",
      "storagePath",
      "providerIdentity",
      "requestHeaders",
      "requestBody",
      "cookieValue",
      "credential",
      "secret",
    ]) {
      expect(serialized).not.toContain(prohibitedField);
    }
  });
});
