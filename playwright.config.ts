import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

loadEnv({ path: path.resolve(rootDir, '.env') })
loadEnv({ path: path.resolve(rootDir, '.env.test'), override: true })

process.env.PAYLOAD_TEST_NO_PUSH = '1'
process.env.AGENT_E2E_MOCK = '1'

const port = process.env.PW_PORT ?? '3100'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /agent-p2-api\.spec\.ts/ },
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /agent-p2-api\.spec\.ts/],
    },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-e2e pnpm exec next dev --webpack -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      AGENT_E2E_MOCK: '1',
      PAYLOAD_TEST_NO_PUSH: '1',
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
})
