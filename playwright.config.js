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

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  timeout: 60_000,
  use: {
    connectOptions: { wsEndpoint: wsEndpoints[backend] },
    baseURL: process.env.TEST_URL || 'http://127.0.0.1:8765',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
