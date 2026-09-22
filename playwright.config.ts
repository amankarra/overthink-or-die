import { defineConfig } from '@playwright/test';

declare const process: {
  env: Record<string, string | undefined>;
};

const isProdSmoke = process.env.SMOKE_PROD === '1';
const port = isProdSmoke ? 4174 : 4173;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        baseURL: `http://127.0.0.1:${port}`,
      },
    },
  ],
  webServer: {
    command: isProdSmoke
      ? `vite preview --host 127.0.0.1 --port ${port}`
      : `vite --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/?scene=title`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
