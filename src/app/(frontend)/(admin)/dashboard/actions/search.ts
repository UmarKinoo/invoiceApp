'use server'

import { getPayloadClient } from '@/lib/payload-server'

export type SearchResult = {
  clients: { id: number; name: string | null; company: string | null; email: string | null }[]
  invoices: { id: number; invoiceNumber: string | null; total?: number; client?: unknown }[]
  quotes: { id: number; quoteNumber: string | null; total?: number; client?: unknown }[]
}

export async function searchDashboard(q: string, limit = 5): Promise<SearchResult | { error: string }> {
  const trimmed = q?.trim() ?? ''
  if (!trimmed || trimmed.length < 2) {
    return { clients: [], invoices: [], quotes: [] }
  }
  try {
    const payload = await getPayloadClient()
    const [clientsRes, invoicesRes, quotesRes] = await Promise.all([
      payload.find({
        collection: 'clients',
        where: {
          or: [
            { name: { like: trimmed } },
            { company: { like: trimmed } },
            { email: { like: trimmed } },
          ],
        },
        limit,
        depth: 0,
      }),
      payload.find({
        collection: 'invoices',
        where: { invoiceNumber: { like: trimmed } },
        limit,
        depth: 1,
      }),
      payload.find({
        collection: 'quotes',
        where: { quoteNumber: { like: trimmed } },
        limit,
        depth: 1,
      }),
    ])
    return {
      clients: (clientsRes.docs ?? []) as SearchResult['clients'],
      invoices: (invoicesRes.docs ?? []) as SearchResult['invoices'],
      quotes: (quotesRes.docs ?? []) as SearchResult['quotes'],
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Search failed' }
  }
}
