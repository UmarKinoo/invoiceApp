import { getPayloadClient } from '@/lib/payload-server'
import { getUser } from '@/lib/auth'
import { computeLedgerSummary } from '@/lib/ledger-stats'
import { listAgentSessionsForUser } from '@/lib/agent/list-sessions'
import { DashboardPageClient } from './dashboard-page-client'
import type { Invoice, Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUser()
  let invoices: Invoice[] = []
  let clients: Client[] = []
  let ledgerStats: { revenue: number; outstanding: number } | undefined
  let recentAgentSessions: Awaited<ReturnType<typeof listAgentSessionsForUser>> = []

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
    const summary = await computeLedgerSummary(payload)
    ledgerStats = { revenue: summary.revenue, outstanding: summary.outstanding }
  } catch {
    ledgerStats = undefined
  }

  if (user?.id) {
    try {
      const payload = await getPayloadClient()
      recentAgentSessions = await listAgentSessionsForUser(payload, user.id, 5)
    } catch {
      recentAgentSessions = []
    }
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
      recentAgentSessions={recentAgentSessions}
    />
  )
}
