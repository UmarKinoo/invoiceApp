import { getPayloadClient } from '@/lib/payload-server'
import { ClientsPageClient } from './clients-page-client'
import type { Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  let clients: Client[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'clients', limit: 200 })
    clients = (res.docs ?? []) as Client[]
  } catch {
    clients = []
  }

  return (
    <ClientsPageClient
      initialClients={clients.map((c) => ({
        id: String(c.id),
        name: c.name ?? null,
        company: c.company ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
      }))}
    />
  )
}
