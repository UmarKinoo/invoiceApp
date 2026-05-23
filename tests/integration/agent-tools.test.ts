import { beforeAll, describe, expect, it } from 'vitest'
import { findClientTool } from '@/lib/agent/tools/clients'
import { createInvoiceTool } from '@/lib/agent/tools/invoices'
import {
  findInvoiceTool,
  getInvoiceTool,
  updateInvoiceStatusTool,
} from '@/lib/agent/tools/invoice-tools'
import { getLedgerSummaryTool } from '@/lib/agent/tools/ledger'
import { getTestAuthContext } from '../helpers/payload-auth'
import { getPayloadClient } from '@/lib/payload-server'

const dbRequired = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!dbRequired)('agent tools', () => {
  let userId = 0
  let testClientId = 0
  const testClientName = `Agent Test Client ${Date.now()}`
  let testInvoiceId = 0
  let testInvoiceNumber = ''

  beforeAll(async () => {
    const ctx = await getTestAuthContext()
    userId = ctx.user.id
    const payload = await getPayloadClient()
    const client = await payload.create({
      collection: 'clients',
      data: {
        name: testClientName,
        email: `agent-test-${Date.now()}@example.com`,
        phone: '+15550009999',
      },
      user: { id: userId, collection: 'users' } as never,
    })
    testClientId = client.id as number

    const due = new Date()
    due.setDate(due.getDate() + 30)
    const createOut = await createInvoiceTool.invoke(
      {
        clientId: testClientId,
        items: [{ description: 'Agent tool test line', quantity: 1, rate: 100 }],
        dueDate: due.toISOString().slice(0, 10),
        status: 'draft',
      },
      { configurable: { toolContext: { userId } } },
    )
    const created = JSON.parse(createOut) as { ok: boolean; id: number; invoiceNumber: string }
    expect(created.ok).toBe(true)
    testInvoiceId = created.id
    testInvoiceNumber = created.invoiceNumber
  })

  const toolConfig = () => ({ configurable: { toolContext: { userId } } })

  it('find_client returns matches by name', async () => {
    const out = await findClientTool.invoke(
      { query: testClientName.slice(0, 12), limit: 5 },
      toolConfig(),
    )
    const parsed = JSON.parse(out) as { matches: { name: string }[] }
    expect(parsed.matches.length).toBeGreaterThan(0)
    expect(parsed.matches.some((m) => m.name.includes('Agent Test'))).toBe(true)
  })

  it('find_client returns empty hint for nonsense query', async () => {
    const out = await findClientTool.invoke(
      { query: `zzznomatch-${Date.now()}`, limit: 3 },
      toolConfig(),
    )
    const parsed = JSON.parse(out) as { matches: unknown[]; hint?: string }
    expect(parsed.matches).toEqual([])
    expect(parsed.hint).toBeTruthy()
  })

  it('find_invoice returns invoice by number', async () => {
    const out = await findInvoiceTool.invoke(
      { query: testInvoiceNumber, limit: 5 },
      toolConfig(),
    )
    const parsed = JSON.parse(out) as { matches: { id: number; invoiceNumber: string }[] }
    expect(parsed.matches.some((m) => m.id === testInvoiceId)).toBe(true)
  })

  it('find_invoice filters by clientId', async () => {
    const out = await findInvoiceTool.invoke({ clientId: testClientId, limit: 10 }, toolConfig())
    const parsed = JSON.parse(out) as { matches: { id: number }[] }
    expect(parsed.matches.length).toBeGreaterThan(0)
    expect(parsed.matches.some((m) => m.id === testInvoiceId)).toBe(true)
  })

  it('get_invoice returns line items', async () => {
    const out = await getInvoiceTool.invoke({ invoiceId: testInvoiceId }, toolConfig())
    const parsed = JSON.parse(out) as {
      ok: boolean
      invoice: { items: { description: string }[] }
    }
    expect(parsed.ok).toBe(true)
    expect(parsed.invoice.items.length).toBeGreaterThan(0)
  })

  it('get_ledger_summary returns numeric totals', async () => {
    const out = await getLedgerSummaryTool.invoke({}, toolConfig())
    const parsed = JSON.parse(out) as {
      revenue: number
      outstanding: number
      invoiceCount: number
    }
    expect(parsed.invoiceCount).toBeGreaterThan(0)
    expect(typeof parsed.revenue).toBe('number')
    expect(typeof parsed.outstanding).toBe('number')
  })

  it('update_invoice_status changes status', async () => {
    const out = await updateInvoiceStatusTool.invoke(
      { invoiceId: testInvoiceId, status: 'sent' },
      toolConfig(),
    )
    const parsed = JSON.parse(out) as { ok: boolean; status: string; previousStatus: string }
    expect(parsed.ok).toBe(true)
    expect(parsed.status).toBe('sent')
    expect(parsed.previousStatus).toBe('draft')
  })
})
