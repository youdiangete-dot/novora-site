import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./tests/e2e",testMatch:["customer-image-library.spec.ts","invitation-test-period-spending.spec.ts","invitation-test-period-025.spec.ts","invitation-trial-spending.spec.ts","customer-trial-integration.spec.ts","openai-first-preview-provider.spec.ts"],reporter:"list",workers:1});
