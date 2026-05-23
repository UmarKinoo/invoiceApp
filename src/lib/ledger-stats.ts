import type { Payload } from 'payload'
import type { Invoice, Transaction } from '@/payload-types'

export type LedgerSummary = {
  revenue: number
  outstanding: number
  invoiceCount: number
  clientCount: number
  currency: string
}

export function computeLedgerFromDocs(
  invoices: Invoice[],
  transactions: Transaction[],
): Pick<LedgerSummary, 'revenue' | 'outstanding' | 'invoiceCount'> {
  const txRevenue = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + (Number(t.amount) ?? 0), 0)

  const invoicePayments = new Map<number, number>()
  for (const t of transactions) {
    if (t.type !== 'income' || !t.invoice) continue
    const id = typeof t.invoice === 'object' ? (t.invoice as { id: number }).id : t.invoice
    invoicePayments.set(id, (invoicePayments.get(id) ?? 0) + (Number(t.amount) ?? 0))
  }

  let paidTotal = 0
  let outstanding = 0
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue
    const total = Number(inv.total) ?? 0
    if (inv.status === 'paid') {
      paidTotal += total
    } else {
      const txPaid = invoicePayments.get(inv.id) ?? 0
      const remaining = Math.max(0, total - txPaid)
      paidTotal += txPaid
      outstanding += remaining
    }
  }

  return {
    revenue: Math.max(paidTotal, txRevenue),
    outstanding,
    invoiceCount: invoices.length,
  }
}

/** Same ledger math as the Insights dashboard. */
export async function computeLedgerSummary(payload: Payload): Promise<LedgerSummary> {
  const [invRes, txRes, clientsRes, settings] = await Promise.all([
    payload.find({ collection: 'invoices', pagination: false, sort: '-updatedAt', depth: 0 }),
    payload.find({ collection: 'transactions', pagination: false, depth: 0 }),
    payload.find({ collection: 'clients', pagination: false, depth: 0 }),
    payload.findGlobal({ slug: 'settings' }),
  ])

  const invoices = (invRes.docs ?? []) as Invoice[]
  const transactions = (txRes.docs ?? []) as Transaction[]
  const stats = computeLedgerFromDocs(invoices, transactions)

  return {
    ...stats,
    clientCount: clientsRes.docs?.length ?? 0,
    currency: (settings?.currency as string) ?? 'MUR',
  }
}
