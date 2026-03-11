import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload-server'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { QuotesListClient } from './quotes-list-client'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import type { Quote, Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(String(pageParam ?? '1'), 10) || 1)

  let quotes: Quote[] = []
  let totalPages = 1
  let clients: Client[] = []
  try {
    const payload = await getPayloadClient()
    const [qRes, cRes] = await Promise.all([
      payload.find({
        collection: 'quotes',
        limit: LIST_PAGE_SIZE,
        page,
        depth: 1,
        sort: '-updatedAt',
      }),
      payload.find({ collection: 'clients', limit: 100, depth: 0 }),
    ])
    quotes = (qRes.docs ?? []) as Quote[]
    totalPages = qRes.totalPages ?? 1
    clients = (cRes.docs ?? []) as Client[]
  } catch {
    quotes = []
    totalPages = 1
    clients = []
  }

  const quoteList = quotes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber ?? null,
    date: q.date ?? null,
    status: q.status ?? null,
    total: Number(q.total) ?? 0,
    client: q.client,
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Quotes"
        description="Proposal management and pipeline."
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/quotes/new">
              <Plus className="size-4" />
              <span className="hidden lg:inline">New Quote</span>
            </Link>
          </Button>
        }
      />
      <QuotesListClient
        initialQuotes={quoteList}
        clients={clients.map((c) => ({ id: c.id, name: c.name ?? null }))}
        totalPages={totalPages}
        currentPage={page}
      />
    </div>
  )
}
