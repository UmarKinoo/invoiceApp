import { getPayloadClient } from '@/lib/payload-server'
import { getUser } from '@/lib/auth'
import { DashboardPageClient } from './dashboard-page-client'
import type { Invoice, Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUser()
  let invoices: Invoice[] = []
  let clients: Client[] = []
  try {
    const payload = await getPayloadClient()
    const [invRes, clientsRes] = await Promise.all([
      payload.find({ collection: 'invoices', limit: 100 }),
      payload.find({ collection: 'clients', limit: 1000 }),
    ])
    invoices = (invRes.docs ?? []) as Invoice[]
    clients = (clientsRes.docs ?? []) as Client[]
  } catch {
    invoices = []
    clients = []
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
    />
  )
}
