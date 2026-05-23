import { test, expect } from '@playwright/test'

/** API contract tests without browser auth cookies. */
test.describe('Agent P2 API (unauthenticated)', () => {
  test('chat API returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/agent/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: { messages: [{ role: 'user', content: 'hi' }] },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toMatch(/unauthorized/i)
  })

  test('sessions API returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/agent/sessions')
    expect(res.status()).toBe(401)
  })

  test('activities API returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/agent/activities')
    expect(res.status()).toBe(401)
  })
})
