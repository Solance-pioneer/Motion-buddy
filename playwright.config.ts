import { defineConfig, devices } from '@playwright/test'

const port = 43124

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
  },
  webServer: [
    {
      command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite build --config vite.owner.config.ts && npx vite preview --config vite.owner.config.ts --host 127.0.0.1 --port 43130 --strictPort`,
      url: 'http://127.0.0.1:43130/owner.html',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
