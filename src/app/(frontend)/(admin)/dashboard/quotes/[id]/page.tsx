import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { QuoteDetailClient } from './quote-detail-client'
import type { Quote } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const payload = await getPayloadClient()
  let quote: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>> | null = null
  try {
    quote = await payload.findByID({
      collection: 'quotes',
      id: Number(id),
      depth: 1,
    })
  } catch {
    quote = null
  }
  if (!quote) notFound()

  const q = quote as Quote
  const client = typeof q.client === 'object' && q.client ? q.client : null
  const clientData = client
    ? {
        name: client.name ?? null,
        company: client.company ?? null,
        email: 'email' in client ? client.email ?? null : null,
      }
    : null

  const items = q.items ?? []
  const total = Number(q.total) ?? items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)

  const clientId = typeof q.client === 'object' && q.client ? q.client.id : typeof q.client === 'number' ? q.client : null

  const serialized = {
    id: q.id,
    quoteNumber: q.quoteNumber ?? null,
    date: q.date ?? null,
    status: q.status ?? null,
    total,
    items,
    clientId,
  }

  return (
    <QuoteDetailClient
      quote={serialized}
      client={clientData}
    />
  )
}
