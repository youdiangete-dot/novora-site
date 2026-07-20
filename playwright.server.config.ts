import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results-server",
  fullyParallel: true,
  reporter: "list",
});
