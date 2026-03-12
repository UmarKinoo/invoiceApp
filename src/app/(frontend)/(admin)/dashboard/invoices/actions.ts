'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

/**
 * Server actions use Payload's Local API instead of HTTP to your own /api routes.
 * Same auth, validation, and hooks run—no REST in between.
 */

export async function getNextInvoiceNumber(): Promise<{ nextNumber: number } | { error: string }> {
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
    return { nextNumber: nextNum }
  } catch (e) {
    return { error: 'Failed to get next invoice number' }
  }
}

export async function createInvoice(data: {
  client: number
  invoiceNumber: string
  date: string
  dueDate: string
  items: { description: string; quantity: number; rate: number }[]
  status?: string
  taxRate?: number
  discount?: number
  shipping?: number
  carNumber?: string
  notes?: string
  subtotal: number
  tax: number
  total: number
}): Promise<{ doc?: { id: number }; errors?: { message: string }[] }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await payload.create({ collection: 'invoices', data: data as any })
    revalidatePath('/dashboard/invoices')
    return { doc: { id: doc.id as number } }
  } catch (err: unknown) {
    const payloadErr = err as { errors?: { message: string }[] }
    return { errors: payloadErr?.errors ?? [{ message: 'Failed to create invoice' }] }
  }
}

export async function updateInvoice(
  id: number,
  data: Partial<{
    status: string
    client: number
    invoiceNumber: string
    date: string
    dueDate: string
    items: { description: string; quantity: number; rate: number }[]
    taxRate: number
    discount: number
    shipping: number
    carNumber: string
    notes: string
    subtotal: number
    tax: number
    total: number
  }>
): Promise<{ doc?: { id: number }; errors?: { message: string }[] }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.update({ collection: 'invoices', id, data: data as any })
    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/invoices/${id}`)
    return { doc: { id } }
  } catch (err: unknown) {
    const payloadErr = err as { errors?: { message: string }[] }
    return { errors: payloadErr?.errors ?? [{ message: 'Failed to update invoice' }] }
  }
}

export async function deleteInvoice(id: number): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'invoices', id })
    revalidatePath('/dashboard/invoices')
    return { ok: true }
  } catch {
    return { error: 'Failed to delete invoice' }
  }
}

const VALID_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'] as const

const LOG = (msg: string, ...args: unknown[]) => {
  console.error(`[BulkStatus] ${msg}`, ...args)
}

type InvoiceStatus = (typeof VALID_STATUSES)[number]

export async function bulkUpdateInvoiceStatus(
  ids: number[],
  status: string
): Promise<{ updated?: number; error?: string }> {
  LOG('start', { ids, status })
  if (ids.length === 0) {
    LOG('early return: no ids')
    return { updated: 0 }
  }
  if (!VALID_STATUSES.includes(status as InvoiceStatus)) {
    LOG('invalid status', status)
    return { error: 'Invalid status' }
  }
  const statusVal = status as InvoiceStatus
  try {
    LOG('getPayloadClient...')
    const payload = await getPayloadClient()
    LOG('getPayloadClient done')
    let updated = 0
    for (const id of ids) {
      LOG('payload.update id=%s status=%s', id, status)
      await payload.update({ collection: 'invoices', id, data: { status: statusVal } })
      updated += 1
      LOG('payload.update done for id=%s', id)
    }
    LOG('revalidatePath...')
    revalidatePath('/dashboard/invoices')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/transactions')
    LOG('success', { updated })
    return { updated }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    LOG('error', message, e)
    return { error: message }
  }
}
