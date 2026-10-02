import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  webServer: {
    command: 'node --import tsx scripts/e2e-server.ts',
    url: 'http://127.0.0.1:3001/health',
    reuseExistingServer: false,
  },
  reporter: 'list',
});
