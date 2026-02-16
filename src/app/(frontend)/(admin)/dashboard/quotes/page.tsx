import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload-server'
import { QuotesListClient } from './quotes-list-client'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import type { Quote, Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  let quotes: Quote[] = []
  let clients: Client[] = []
  try {
    const payload = await getPayloadClient()
    const [qRes, cRes] = await Promise.all([
      payload.find({ collection: 'quotes', limit: 100, depth: 1 }),
      payload.find({ collection: 'clients', limit: 500 }),
    ])
    quotes = (qRes.docs ?? []) as Quote[]
    clients = (cRes.docs ?? []) as Client[]
  } catch {
    quotes = []
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
      <QuotesListClient initialQuotes={quoteList} clients={clients.map((c) => ({ id: c.id, name: c.name ?? null }))} />
    </div>
  )
}
