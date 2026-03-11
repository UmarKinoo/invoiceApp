'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export async function createQuote(data: {
  client: number
  quoteNumber: string
  date: string
  items: { description: string; quantity: number; rate: number }[]
  status?: string
  total: number
}): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await payload.create({ collection: 'quotes', data: data as any })
    revalidatePath('/dashboard/quotes')
    return { doc: { id: doc.id as number } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create quote' }
  }
}

export async function updateQuote(
  id: number,
  data: Partial<{
    client: number
    quoteNumber: string
    date: string
    items: { description: string; quantity: number; rate: number }[]
    status: string
    total: number
  }>
): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.update({ collection: 'quotes', id, data: data as any })
    revalidatePath('/dashboard/quotes')
    revalidatePath(`/dashboard/quotes/${id}`)
    return { doc: { id } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update quote' }
  }
}

export async function deleteQuote(id: number): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'quotes', id })
    revalidatePath('/dashboard/quotes')
    return { ok: true }
  } catch {
    return { error: 'Failed to delete quote' }
  }
}
