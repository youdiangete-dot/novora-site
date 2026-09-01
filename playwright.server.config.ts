import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /(?:first-preview-(?:persistence|runtime|generated-assets|japan-gateway)|supabase-first-preview-repository)\.spec\.ts/,
  outputDir: "./test-results-server",
  fullyParallel: true,
  reporter: "list",
});
