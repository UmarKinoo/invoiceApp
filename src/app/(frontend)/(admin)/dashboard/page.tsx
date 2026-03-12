import { getPayloadClient } from '@/lib/payload-server'
import { getUser } from '@/lib/auth'
import { DashboardPageClient } from './dashboard-page-client'
import type { Invoice, Client, Transaction } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUser()
  let invoices: Invoice[] = []
  let clients: Client[] = []
  let ledgerStats: { revenue: number; outstanding: number } | undefined

  try {
    const payload = await getPayloadClient()
    const [invRes, clientsRes] = await Promise.all([
      payload.find({ collection: 'invoices', pagination: false, sort: '-updatedAt', depth: 0 }),
      payload.find({ collection: 'clients', pagination: false, depth: 0 }),
    ])
    invoices = (invRes.docs ?? []) as Invoice[]
    clients = (clientsRes.docs ?? []) as Client[]
  } catch {
    invoices = []
    clients = []
  }

  try {
    const payload = await getPayloadClient()
    const txRes = await payload.find({
      collection: 'transactions',
      pagination: false,
      depth: 0,
    })
    const transactions = (txRes.docs ?? []) as Transaction[]
    if (transactions.length === 0) {
      ledgerStats = undefined
    } else {
      const revenue = transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + (Number(t.amount) ?? 0), 0)
      const invoicePayments = new Map<number, number>()
      for (const t of transactions) {
        if (t.type !== 'income' || !t.invoice) continue
        const id = typeof t.invoice === 'object' ? (t.invoice as { id: number }).id : t.invoice
        invoicePayments.set(id, (invoicePayments.get(id) ?? 0) + (Number(t.amount) ?? 0))
      }
      let outstanding = 0
      for (const inv of invoices) {
        if (inv.status === 'cancelled') continue
        const total = Number(inv.total) ?? 0
        const paid = invoicePayments.get(inv.id) ?? 0
        outstanding += Math.max(0, total - paid)
      }
      ledgerStats = { revenue, outstanding }
    }
  } catch {
    ledgerStats = undefined
  }

  return (
    <DashboardPageClient
      user={user}
      invoices={invoices.map((d) => ({
        id: String(d.id),
        invoiceNumber: d.invoiceNumber ?? null,
        date: d.date ?? null,
        total: Number(d.total) ?? 0,
        status: d.status ?? null,
      }))}
      clients={clients.map((c) => ({ id: String(c.id) }))}
      ledgerStats={ledgerStats}
    />
  )
}
