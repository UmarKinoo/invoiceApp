import { getPayloadClient } from '@/lib/payload-server'
import { InvoicesPageClient } from './invoices-page-client'
import type { Client, Invoice } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>
}) {
  const { edit: editId, new: newInvoice } = await searchParams
  let invoices: Invoice[] = []
  let clients: Client[] = []
  let settings: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findGlobal']>> | null = null

  try {
    const payload = await getPayloadClient()
    const [invRes, clRes] = await Promise.all([
      payload.find({ collection: 'invoices', limit: 100, depth: 1 }),
      payload.find({ collection: 'clients', limit: 500 }),
    ])
    invoices = (invRes.docs ?? []) as Invoice[]
    clients = (clRes.docs ?? []) as Client[]
    settings = await payload.findGlobal({ slug: 'settings' })
  } catch {
    invoices = []
    clients = []
    settings = null
  }

  const initialInvoices = invoices.map((inv) => {
    const client = inv.client
    const clientNorm =
      typeof client === 'object' && client != null
        ? { id: String(client.id), name: client.name ?? null, company: client.company ?? null }
        : client
    return {
      id: String(inv.id),
      invoiceNumber: inv.invoiceNumber ?? null,
      date: inv.date ?? null,
      dueDate: inv.dueDate ?? null,
      status: inv.status ?? null,
      taxRate: inv.taxRate ?? null,
      discount: inv.discount ?? null,
      shipping: inv.shipping ?? null,
      carNumber: inv.carNumber ?? null,
      notes: inv.notes ?? null,
      total: Number(inv.total) ?? 0,
      client: clientNorm,
      items: inv.items,
    }
  })

  const initialSettings = settings
    ? {
        businessName: settings.businessName ?? '',
        businessAddress: settings.businessAddress ?? '',
        businessEmail: settings.businessEmail ?? '',
        logoUrl: settings.logoUrl ?? null,
        invoicePrefix: settings.invoicePrefix ?? 'INV-',
        taxRateDefault: Number(settings.taxRateDefault) ?? 0,
        currency: settings.currency ?? 'MUR',
      }
    : null

  return (
    <InvoicesPageClient
      initialInvoices={initialInvoices}
      initialClients={clients.map((c) => ({
        id: String(c.id),
        name: c.name ?? null,
        company: c.company ?? null,
      }))}
      initialSettings={initialSettings}
      initialEditId={editId ?? undefined}
      initialNewInvoice={newInvoice === '1'}
    />
  )
}
