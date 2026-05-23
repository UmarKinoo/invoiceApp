import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { getPayloadClient } from '@/lib/payload-server'
import { computeLedgerSummary } from '@/lib/ledger-stats'

export const getLedgerSummaryTool = tool(
  async (): Promise<string> => {
    const payload = await getPayloadClient()
    const summary = await computeLedgerSummary(payload)
    return JSON.stringify({
      currency: summary.currency,
      revenue: summary.revenue,
      outstanding: summary.outstanding,
      invoiceCount: summary.invoiceCount,
      clientCount: summary.clientCount,
      hint: 'Revenue and outstanding match the Insights dashboard (payments + invoice balances).',
    })
  },
  {
    name: 'get_ledger_summary',
    description:
      'Get workspace totals: revenue collected, outstanding balance, invoice and client counts, currency. ' +
      'Use for questions like "how much is outstanding?" or "what did we make this month?" (totals are all-time unless user specifies a filter).',
    schema: z.object({}),
  },
)
