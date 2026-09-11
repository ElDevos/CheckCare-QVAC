import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure'
  },
  // This suite assumes `npm run dev` (both apps/edge and apps/web) is
  // already running with the real MedPsy model loaded — it exercises the
  // real pipeline end to end, not a mock.
  webServer: undefined
})
