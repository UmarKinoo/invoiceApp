import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getTestAuthContext, getSecondaryTestAuthContext } from '../helpers/payload-auth'
import { readSseEvents, eventTypes } from '../helpers/parse-sse'

let authToken = ''

vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers(authToken ? { cookie: `payload-token=${authToken}` } : {}),
  cookies: async () => ({
    get: (name: string) =>
      name === 'payload-token' && authToken ? { value: authToken } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const dbRequired = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!dbRequired)('agent API routes', () => {
  let primaryUserId = 0
  let otherUserToken = ''

  beforeAll(async () => {
    const ctx = await getTestAuthContext()
    authToken = ctx.token
    primaryUserId = ctx.user.id
    const other = await getSecondaryTestAuthContext()
    otherUserToken = other.token
  })

  it('GET /api/agent/sessions returns 401 without auth', async () => {
    authToken = ''
    const { GET } = await import('@/app/api/agent/sessions/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const ctx = await getTestAuthContext()
    authToken = ctx.token
  })

  it('GET /api/agent/sessions lists sessions for user', async () => {
    const { GET } = await import('@/app/api/agent/sessions/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = (await res.json()) as { sessions: unknown[] }
    expect(Array.isArray(data.sessions)).toBe(true)
  })

  it('POST /api/agent/chat rejects empty messages', async () => {
    const { POST } = await import('@/app/api/agent/chat/route')
    const res = await POST(
      new Request('http://localhost/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('POST /api/agent/chat mock stream creates session and draft_link', async () => {
    const { POST } = await import('@/app/api/agent/chat/route')
    const res = await POST(
      new Request('http://localhost/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '[mock:draft] test invoice' }],
          e2eScenario: 'draft',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const events = await readSseEvents(res)
    expect(eventTypes(events)).toContain('session')
    expect(eventTypes(events)).toContain('draft_link')
    const session = events.find((e) => e.type === 'session') as { threadId: string }
    expect(session.threadId).toBeTruthy()
  })

  it('POST /api/agent/chat mock interrupt', async () => {
    const { POST } = await import('@/app/api/agent/chat/route')
    const res = await POST(
      new Request('http://localhost/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'confirm please' }],
          e2eScenario: 'interrupt',
        }),
      }),
    )
    const events = await readSseEvents(res)
    expect(eventTypes(events)).toContain('interrupt')
  })

  it('forbids access to another user thread', async () => {
    const { POST } = await import('@/app/api/agent/chat/route')
    const createRes = await POST(
      new Request('http://localhost/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'my private thread' }],
          e2eScenario: 'activities',
        }),
      }),
    )
    const events = await readSseEvents(createRes)
    const threadId = (events.find((e) => e.type === 'session') as { threadId: string }).threadId

    authToken = otherUserToken
    const { GET } = await import('@/app/api/agent/sessions/[id]/history/route')
    const histRes = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: threadId }),
    })
    expect(histRes.status).toBe(403)

    const ctx = await getTestAuthContext()
    authToken = ctx.token
    void primaryUserId
  })

  it('GET /api/agent/activities requires threadId', async () => {
    const { GET } = await import('@/app/api/agent/activities/route')
    const res = await GET(new Request('http://localhost/api/agent/activities'))
    expect(res.status).toBe(400)
  })
})
