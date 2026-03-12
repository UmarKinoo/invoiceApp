import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { getUser } from '@/lib/auth'
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
  let settings: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findGlobal']>> | null = null
  try {
    const [invRes, settingsRes] = await Promise.all([
      payload.findByID({ collection: 'invoices', id: Number(id), depth: 1 }),
      payload.findGlobal({ slug: 'settings', depth: 1 }),
    ])
    invoice = invRes
    settings = settingsRes
  } catch {
    invoice = null
    settings = null
  }
  if (!invoice) notFound()

  const inv = invoice as Invoice
  const client = typeof inv.client === 'object' && inv.client ? inv.client : null
  const clientData = client
    ? {
        name: client.name ?? null,
        company: client.company ?? null,
        email: 'email' in client ? client.email ?? null : null,
        address: 'address' in client ? (client as { address?: string | null }).address ?? null : null,
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
    subtotal: Number(inv.subtotal) ?? subtotal,
    tax: Number(inv.tax),
    discount: Number(inv.discount) ?? 0,
    shipping: Number(inv.shipping) ?? 0,
    taxRate: Number(inv.taxRate) ?? 15,
    carNumber: inv.carNumber ?? null,
    notes: inv.notes ?? null,
    items,
  }

  const business = settings
    ? {
        businessName: (settings as { businessName?: string }).businessName ?? '',
        businessAddress: (settings as { businessAddress?: string }).businessAddress ?? '',
        businessEmail: (settings as { businessEmail?: string }).businessEmail ?? '',
        businessPhone: (settings as { businessPhone?: string }).businessPhone ?? '',
        businessBrn: (settings as { businessBrn?: string }).businessBrn ?? '',
        vatRegistrationNumber: (settings as { vatRegistrationNumber?: string }).vatRegistrationNumber ?? '',
        logoUrl: (settings as { logoUrl?: string }).logoUrl ?? null,
        logo: (settings as { logo?: { url?: string } | number }).logo ?? null,
      }
    : null

  const user = await getUser()
  const deliveredBy = user?.email ?? null

  return (
    <InvoiceDetailClient
      invoice={serialized}
      client={clientData}
      business={business}
      deliveredBy={deliveredBy}
      printMode={print === '1'}
    />
  )
}
