import { test as setup, chromium } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTestAuthContext } from '../helpers/payload-auth'

const authFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth/user.json')
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

setup('authenticate test user', async () => {
  const { token } = await getTestAuthContext()
  const browser = await chromium.launch()
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: 'payload-token',
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  await context.storageState({ path: authFile })
  await browser.close()
})
