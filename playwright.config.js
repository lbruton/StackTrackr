// @ts-check
import { defineConfig, devices } from '@playwright/test';

const backend = process.env.BROWSER_BACKEND || 'browserless';
const wsEndpoints = {
  browserless: `ws://localhost:3000?token=${process.env.BROWSERLESS_TOKEN || 'local_dev_token'}`,
  browserbase: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&projectId=${process.env.BROWSERBASE_PROJECT_ID}`,
};

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    connectOptions: { wsEndpoint: wsEndpoints[backend] },
    baseURL: process.env.TEST_URL || 'http://127.0.0.1:8765',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
