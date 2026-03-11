import { getPayloadClient } from '@/lib/payload-server'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { ClientsPageClient } from './clients-page-client'
import type { Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(String(pageParam ?? '1'), 10) || 1)

  let clients: Client[] = []
  let totalPages = 1
  let totalDocs = 0
  try {
    const payload = await getPayloadClient()
    const [res, countRes] = await Promise.all([
      payload.find({
        collection: 'clients',
        pagination: false,
        depth: 0,
        sort: 'name',
      }),
      payload.count({ collection: 'clients' }),
    ])
    const allDocs = (res.docs ?? []) as Client[]
    const start = (page - 1) * LIST_PAGE_SIZE
    clients = allDocs.slice(start, start + LIST_PAGE_SIZE)
    totalDocs = (countRes as { totalDocs: number })?.totalDocs ?? allDocs.length
    totalPages = totalDocs > 0 ? Math.max(1, Math.ceil(totalDocs / LIST_PAGE_SIZE)) : 1
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
        brn: c.brn ?? null,
        address: c.address ?? null,
      }))}
      totalPages={totalPages}
      totalDocs={totalDocs}
      currentPage={page}
    />
  )
}
