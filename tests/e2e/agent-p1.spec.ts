import { test, expect } from '@playwright/test'
import { sendAgentMessage, startFreshAgentChat } from './helpers'

test.describe('Agent P1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/agent', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /CRM Assistant/i })).toBeVisible({
      timeout: 30_000,
    })
    await startFreshAgentChat(page)
  })

  test('mock interrupt shows confirmation', async ({ page }) => {
    await sendAgentMessage(page, '[mock:interrupt] confirm')
    await expect(page.getByText(/confirmation required/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/reply yes to confirm/i)).toBeVisible()
  })

  test('awaiting resume changes input placeholder', async ({ page }) => {
    await sendAgentMessage(page, '[mock:interrupt]')
    await expect(page.getByText(/confirmation required/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('agent-chat-input')).toHaveAttribute(
      'placeholder',
      /confirm or clarify/i,
    )
  })

  test('refresh keeps thread in url', async ({ page }) => {
    await sendAgentMessage(page, '[mock:draft] persist me')
    await expect(page).toHaveURL(/thread=\d+/, { timeout: 30_000 })
    const thread = new URL(page.url()).searchParams.get('thread')
    expect(thread).toBeTruthy()

    await page.reload()
    await expect(page).toHaveURL(new RegExp(`thread=${thread}`))
  })

  test('switch between sessions in sidebar', async ({ page }) => {
    const tag = `e2e-${Date.now()}`
    const firstTitle = `First thread ${tag}`
    const secondTitle = `Second thread ${tag}`

    await sendAgentMessage(page, firstTitle)
    await expect(page).toHaveURL(/thread=/, { timeout: 20_000 })

    await startFreshAgentChat(page)
    await sendAgentMessage(page, secondTitle)
    await expect(page.getByText(secondTitle).first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: new RegExp(firstTitle) }).first().click()
    await expect(page.getByText(firstTitle).first()).toBeVisible({ timeout: 15_000 })
  })

  test('message queue shows queued hint', async ({ page }) => {
    await sendAgentMessage(page, '[mock:activities] slow', { waitForResponse: false })
    await expect(page.getByText(/sending/i)).toBeVisible({ timeout: 10_000 })
    await sendAgentMessage(page, 'queued follow-up', { waitForResponse: false })
    await expect(page.getByText(/message queued/i)).toBeVisible({ timeout: 10_000 })
  })
})
