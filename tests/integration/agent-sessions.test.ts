import { beforeAll, describe, expect, it } from 'vitest'
import { assertSessionAccess } from '@/lib/agent/session-auth'
import { resolveAgentThreadId } from '@/lib/agent/resolve-thread'
import { getTestAuthContext, getSecondaryTestAuthContext } from '../helpers/payload-auth'

const dbRequired = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!dbRequired)('agent sessions', () => {
  let userId = 0
  let otherUserId = 0

  beforeAll(async () => {
    const ctx = await getTestAuthContext()
    userId = ctx.user.id
    const other = await getSecondaryTestAuthContext()
    otherUserId = other.user.id
    void otherUserId
  })

  it('resolveAgentThreadId creates and reuses thread', async () => {
    const { payload, user } = await getTestAuthContext()
    const id1 = await resolveAgentThreadId(
      payload,
      user,
      {},
      'First message in test thread',
      'test-req',
    )
    expect(Number(id1)).toBeGreaterThan(0)

    const id2 = await resolveAgentThreadId(
      payload,
      user,
      { threadId: id1 },
      'Follow-up',
      'test-req-2',
    )
    expect(id2).toBe(id1)
  })

  it('assertSessionAccess throws for missing thread', async () => {
    const { payload, user } = await getTestAuthContext()
    await expect(assertSessionAccess(payload, user, '999999999')).rejects.toThrow('Not found')
  })

  it('assertSessionAccess throws forbidden for other user', async () => {
    const primary = await getTestAuthContext()
    const secondary = await getSecondaryTestAuthContext()
    const threadId = await resolveAgentThreadId(
      primary.payload,
      primary.user,
      {},
      'owned by primary',
      'iso',
    )
    await expect(assertSessionAccess(secondary.payload, secondary.user, threadId)).rejects.toThrow(
      'Forbidden',
    )
    void userId
  })
})
