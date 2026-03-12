'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

const METHOD_VALUES = ['stripe', 'paypal', 'bank_transfer', 'cash', 'check'] as const

export async function createTransaction(data: {
  type: 'income' | 'expense'
  date: string
  amount: number
  client: number
  invoice?: number
  reference?: string
  method?: string
  notes?: string
}): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    const method = data.method && METHOD_VALUES.includes(data.method as (typeof METHOD_VALUES)[number])
      ? data.method
      : 'stripe'
    const doc = await payload.create({
      collection: 'transactions',
      data: {
        type: data.type,
        date: data.date,
        amount: data.amount,
        client: data.client,
        invoice: data.invoice ?? undefined,
        reference: data.reference ?? undefined,
        method: method as (typeof METHOD_VALUES)[number],
        notes: data.notes ?? undefined,
      },
    })
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard')
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
