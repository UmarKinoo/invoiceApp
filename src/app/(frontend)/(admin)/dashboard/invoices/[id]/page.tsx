import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { InvoiceDetailClient } from './invoice-detail-client'
import type { Invoice } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  const { print } = await searchParams
  const payload = await getPayloadClient()
  let invoice: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>> | null = null
  try {
    invoice = await payload.findByID({
      collection: 'invoices',
      id: Number(id),
      depth: 1,
    })
  } catch {
    invoice = null
  }
  if (!invoice) notFound()

  const inv = invoice as Invoice
  const client = typeof inv.client === 'object' && inv.client ? inv.client : null
  const clientData = client
    ? {
        name: client.name ?? null,
        company: client.company ?? null,
        email: 'email' in client ? client.email ?? null : null,
      }
    : null

  const items = inv.items ?? []
  const subtotal = items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)

  const serialized = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber ?? null,
    date: inv.date ?? null,
    dueDate: inv.dueDate ?? null,
    status: inv.status ?? null,
    total: Number(inv.total),
    subtotal,
    tax: Number(inv.tax),
    carNumber: inv.carNumber ?? null,
    notes: inv.notes ?? null,
    items,
  }

  return (
    <InvoiceDetailClient
      invoice={serialized}
      client={clientData}
      printMode={print === '1'}
    />
  )
}
