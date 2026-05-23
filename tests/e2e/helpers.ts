import { expect, type Page } from '@playwright/test'

export async function startFreshAgentChat(page: Page): Promise<void> {
  await page.getByRole('button', { name: /new chat/i }).click()
  await expect(page).not.toHaveURL(/thread=/)
  await expect(page.getByTestId('agent-chat-input')).toBeEnabled({ timeout: 15_000 })
}

export type SendAgentMessageOptions = {
  /** Wait for chat API 200 (default true). Set false to send while a stream is still open. */
  waitForResponse?: boolean
}

export async function sendAgentMessage(
  page: Page,
  text: string,
  options: SendAgentMessageOptions = {},
): Promise<void> {
  const { waitForResponse = true } = options

  const responsePromise = waitForResponse
    ? page.waitForResponse(
        (res) => res.url().includes('/api/agent/chat') && res.status() === 200,
        { timeout: 60_000 },
      )
    : null

  await expect
    .poll(
      async () =>
        page.evaluate(() => Boolean((window as Window & { __agentE2e?: unknown }).__agentE2e)),
      { timeout: 15_000 },
    )
    .toBe(true)

  await page.evaluate((message) => {
    ;(window as Window & { __agentE2e: { submit: (t: string) => void } }).__agentE2e.submit(
      message,
    )
  }, text)

  if (responsePromise) await responsePromise
}
