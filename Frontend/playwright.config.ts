import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run start --prefix ../Backend',
      url: 'http://127.0.0.1:5000/api/health',
      timeout: 120000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 120000,
      reuseExistingServer: true,
    },
  ],
});
