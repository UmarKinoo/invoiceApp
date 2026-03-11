import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'

/**
 * GET /api/invoices/next-number
 * Returns the next sequential invoice number (e.g. 1001) for clean format: INV-1001, INV-1002.
 * Parses existing invoice numbers (handles both INV-1001 and legacy INV-1101-md2lmk style).
 */
export async function GET() {
  try {
    const payload = await getPayloadClient()
    const [invRes, settings] = await Promise.all([
      payload.find({ collection: 'invoices', limit: 500 }),
      payload.findGlobal({ slug: 'settings' }),
    ])
    const invoices = invRes.docs ?? []
    const prefix = (settings?.invoicePrefix as string) ?? 'INV-'

    const nextNum =
      invoices.length === 0
        ? 1001
        : Math.max(
            1000,
            ...invoices.map((inv: { invoiceNumber?: string | null }) => {
              const n = inv.invoiceNumber ?? ''
              if (!n.startsWith(prefix)) return 1000
              const after = n.slice(prefix.length)
              const match = after.match(/^\d+/)
              return match ? parseInt(match[0], 10) : 1000
            })
          ) + 1

    return NextResponse.json({ nextNumber: nextNum })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to get next invoice number' }, { status: 500 })
  }
}
