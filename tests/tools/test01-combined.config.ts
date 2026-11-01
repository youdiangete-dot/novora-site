import { defineConfig } from "@playwright/test";
import browser from "./test01-package-browser.config";
const server = browser.webServer as Exclude<NonNullable<typeof browser.webServer>, unknown[]>;

// Only the affected HTTP/Queue/scope and one revision browser case. APIs remain
// mocked and real package/PayPal/generation flags remain forced off by the base.
export default defineConfig({
  ...browser,
  outputDir: "../../out/test01-combined-results",
  webServer: { ...server,
    env: { ...server.env,
      NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET: "TEST-only-preview-feedback-binding-secret-0000" } },
  testMatch: ["automatic-first-preview-generation.spec.ts", "invitation-browser-submission.spec.ts", "invitation-browser-flow.spec.ts", "test01-package-browser.spec.ts"],
  grep: /uncertain funded claim after B|revision HTTP reaches|revision Queue envelope reaches|an UNKNOWN dispatch outcome|trial receipt identity is server verified|revision browser reads one existing operation/,
});
