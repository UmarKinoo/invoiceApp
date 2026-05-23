import { beforeAll, describe, expect, it } from 'vitest'
import { createInvoiceTool } from '@/lib/agent/tools/invoices'
import { getTestAuthContext } from '../helpers/payload-auth'
import { getPayloadClient } from '@/lib/payload-server'

const dbRequired = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!dbRequired)('create_invoice tool', () => {
  let userId = 0
  let clientId = 0

  beforeAll(async () => {
    const ctx = await getTestAuthContext()
    userId = ctx.user.id
    const payload = await getPayloadClient()
    const client = await payload.create({
      collection: 'clients',
      data: {
        name: `Invoice Tool Client ${Date.now()}`,
        email: `inv-tool-${Date.now()}@example.com`,
        phone: '+15550001111',
      },
      user: { id: userId, collection: 'users' } as never,
    })
    clientId = client.id as number
  })

  it('creates draft with reviewUrl', async () => {
    const config = { configurable: { toolContext: { userId } } }
    const due = new Date()
    due.setDate(due.getDate() + 30)
    const out = await createInvoiceTool.invoke(
      {
        clientId,
        items: [{ description: 'Consulting', quantity: 2, rate: 100 }],
        dueDate: due.toISOString().slice(0, 10),
      },
      config,
    )
    const parsed = JSON.parse(out) as {
      ok: boolean
      reviewUrl?: string
      invoiceNumber?: string
    }
    expect(parsed.ok).toBe(true)
    expect(parsed.reviewUrl).toMatch(/\/dashboard\/invoices\/\d+/)
    expect(parsed.invoiceNumber).toBeTruthy()
  })

  it('rejects invalid client id', async () => {
    const config = { configurable: { toolContext: { userId } } }
    const out = await createInvoiceTool.invoke(
      {
        clientId: 999999999,
        items: [{ description: 'X', quantity: 1, rate: 1 }],
        dueDate: '2030-01-01',
      },
      config,
    )
    const parsed = JSON.parse(out) as { ok: boolean }
    expect(parsed.ok).toBe(false)
  })
})
