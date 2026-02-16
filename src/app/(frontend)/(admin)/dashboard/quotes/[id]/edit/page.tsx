import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { QuoteForm } from '@/app/(frontend)/(admin)/dashboard/quote-form'
import { Button } from '@/components/ui/button'
import type { Quote } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function EditQuotePage({
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
  const clientId = typeof q.client === 'object' && q.client ? q.client.id : typeof q.client === 'number' ? q.client : null
  const initialQuote = {
    id: q.id,
    clientId: clientId ?? 0,
    quoteNumber: q.quoteNumber ?? '',
    date: (q.date ?? '').toString().slice(0, 10),
    status: q.status ?? 'pending',
    items: (q.items ?? []).map((i) => ({
      description: i.description ?? '',
      quantity: i.quantity ?? 0,
      rate: i.rate ?? 0,
    })),
    total: Number(q.total) ?? 0,
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/quotes/${q.id}`}>
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Edit {q.quoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground">Update quote details</p>
        </div>
      </header>
      <QuoteForm initialQuote={initialQuote} />
    </div>
  )
}
