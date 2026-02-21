// @ts-check
import { defineConfig, devices } from '@playwright/test';

const backend = process.env.BROWSER_BACKEND || 'browserless';
const wsEndpoints = {
  browserless: `ws://localhost:3000/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN || 'local_dev_token'}`,
  browserbase: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&projectId=${process.env.BROWSERBASE_PROJECT_ID}`,
};

if (!Object.hasOwn(wsEndpoints, backend)) {
  throw new Error(`Unknown BROWSER_BACKEND "${backend}". Valid values: ${Object.keys(wsEndpoints).join(', ')}`);
}
if (backend === 'browserbase' && (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID)) {
  throw new Error('BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID must be set when BROWSER_BACKEND=browserbase');
}

const runId = process.env.TEST_RUN_ID ||
  new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export default defineConfig({
  outputDir: `test-results/${runId}`,
  globalTeardown: './devops/playwright-dash/report-generator.js',
  reporter: [['json', { outputFile: `test-results/${runId}/results.json` }]],
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  timeout: 60_000,
  use: {
    connectOptions: { wsEndpoint: wsEndpoints[backend] },
    // host.docker.internal resolves to the host machine from inside Docker (macOS/Windows).
    // Use TEST_URL env var to override for CI or remote targets.
    baseURL: process.env.TEST_URL || 'http://host.docker.internal:8765',
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
