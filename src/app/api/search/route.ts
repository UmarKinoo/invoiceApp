import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(Number(searchParams.get('limit')) || 5, 10)

  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], invoices: [], quotes: [] })
  }

  try {
    const payload = await getPayloadClient()

    const [clientsRes, invoicesRes, quotesRes] = await Promise.all([
      payload.find({
        collection: 'clients',
        where: {
          or: [
            { name: { like: q } },
            { company: { like: q } },
            { email: { like: q } },
          ],
        },
        limit,
        depth: 0,
      }),
      payload.find({
        collection: 'invoices',
        where: { invoiceNumber: { like: q } },
        limit,
        depth: 1,
      }),
      payload.find({
        collection: 'quotes',
        where: { quoteNumber: { like: q } },
        limit,
        depth: 1,
      }),
    ])

    return NextResponse.json({
      clients: clientsRes.docs ?? [],
      invoices: invoicesRes.docs ?? [],
      quotes: quotesRes.docs ?? [],
    })
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
