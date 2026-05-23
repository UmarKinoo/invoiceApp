import { describe, expect, it } from 'vitest'
import { getCheckpointer } from '@/lib/agent/checkpointer'

const dbRequired = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!dbRequired)('agent checkpointer', () => {
  it('initializes PostgresSaver tables', async () => {
    const saver = await getCheckpointer()
    expect(saver).toBeDefined()
  })
})
