'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(data: {
  date: string
  amount: number
  client: number
  reference?: string
  method?: string
}): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'transactions',
      data: {
        date: data.date,
        amount: data.amount,
        client: data.client,
        reference: data.reference ?? undefined,
        method: (data.method as 'stripe' | 'paypal' | 'bank_transfer' | 'cash') ?? 'stripe',
      },
    })
    revalidatePath('/dashboard/transactions')
    return { doc: { id: doc.id as number } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create transaction' }
  }
}

export async function deleteTransaction(id: number): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'transactions', id })
    revalidatePath('/dashboard/transactions')
    return { ok: true }
  } catch {
    return { error: 'Failed to delete transaction' }
  }
}
