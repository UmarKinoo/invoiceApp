import { test, expect } from '@playwright/test'
import { sendAgentMessage, startFreshAgentChat } from './helpers'

test.describe('Agent P0', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/agent', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /CRM Assistant/i })).toBeVisible({
      timeout: 30_000,
    })
    await startFreshAgentChat(page)
  })

  test('mock draft shows review button and thread in url', async ({ page }) => {
    await sendAgentMessage(page, '[mock:draft] invoice test')
    await expect(page.getByRole('link', { name: /review draft/i })).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/thread=\d+/, { timeout: 15_000 })
  })

  test('inline activity steps appear during mock run', async ({ page }) => {
    await sendAgentMessage(page, '[mock:activities] run tools')
    await expect(page.getByText(/looking up client/i)).toBeVisible({ timeout: 15_000 })
  })

  test('hide and show chats panel', async ({ page }) => {
    await expect(page.getByTestId('agent-chats-panel')).toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => Boolean((window as Window & { __agentE2e?: unknown }).__agentE2e)),
      )
      .toBe(true)
    await page.evaluate(() => {
      const bridge = (window as Window & { __agentE2e: { setChatsOpen: (o: boolean) => void } })
        .__agentE2e
      bridge.setChatsOpen(false)
    })
    await page.waitForSelector('[data-testid="agent-chats-panel"]', { state: 'detached' })
    await page.getByRole('button', { name: /show chats/i }).first().click()
    await expect(page.getByTestId('agent-chats-panel')).toBeVisible()
  })

  test('new chat clears thread param', async ({ page }) => {
    await sendAgentMessage(page, '[mock:activities] one')
    await expect(page).toHaveURL(/thread=/, { timeout: 20_000 })

    await page.getByRole('button', { name: /new chat/i }).click()
    await expect(page).not.toHaveURL(/thread=/)
  })
})
