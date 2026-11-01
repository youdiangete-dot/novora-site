import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../e2e", testMatch: "test01-package-browser.spec.ts", timeout: 45000,
  workers: 1, reporter: "list", outputDir: "../../out/test01-package-browser-results",
  use: { baseURL: "http://127.0.0.1:3107", trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node ../../node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3107",
    cwd: process.cwd(), url: "http://127.0.0.1:3107/design/packages", reuseExistingServer: false, timeout: 120000,
    env: { NEXT_TELEMETRY_DISABLED: "1", NOVORA_TEST_IMAGE_PACKAGES_ENABLED: "false",
      NOVORA_PAYPAL_SANDBOX_ENABLED: "false", NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: "false",
      NOVORA_ADMIN_ACCESS_KEY: "TEST-only-browser-admin-key" },
  },
});
