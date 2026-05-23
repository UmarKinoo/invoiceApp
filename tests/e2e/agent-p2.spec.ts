import { test, expect } from '@playwright/test'
import { sendAgentMessage, startFreshAgentChat } from './helpers'

test.describe('Agent P2 UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/agent', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /CRM Assistant/i })).toBeVisible({
      timeout: 30_000,
    })
    await startFreshAgentChat(page)
  })

  test('activities API requires threadId when authenticated', async ({ page, request }) => {
    const cookies = await page.context().cookies()
    const token = cookies.find((c) => c.name === 'payload-token')?.value
    expect(token).toBeTruthy()

    const res = await request.get('/api/agent/activities', {
      headers: { cookie: `payload-token=${token}` },
    })
    expect(res.status()).toBe(400)
  })

  test('mock error surfaces in chat', async ({ page }) => {
    await sendAgentMessage(page, '[mock:error] fail')
    await expect(page.getByText(/error:\s*mock agent error/i)).toBeVisible({ timeout: 20_000 })
  })

  test('full-width agent layout without activity column', async ({ page }) => {
    await expect(page.getByText(/background work/i)).not.toBeVisible()
    await expect(page.getByRole('button', { name: /^work$/i })).not.toBeVisible()
  })
})

test.describe('Agent P2 authenticated API', () => {
  test('sessions list returns 200 with auth cookie', async ({ page, request }) => {
    await page.goto('/dashboard/agent')
    const cookies = await page.context().cookies()
    const token = cookies.find((c) => c.name === 'payload-token')?.value
    expect(token).toBeTruthy()

    const res = await request.get('/api/agent/sessions', {
      headers: { cookie: `payload-token=${token}` },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { sessions: unknown[] }
    expect(Array.isArray(body.sessions)).toBe(true)
  })
})
