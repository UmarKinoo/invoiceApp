import { getPayloadClient } from '@/lib/payload-server'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { InvoicesPageClient } from './invoices-page-client'
import type { Client, Invoice } from '@/payload-types'
import { getNextInvoiceNumber } from './actions'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string; page?: string }>
}) {
  const { edit: editId, new: newInvoice, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(String(pageParam ?? '1'), 10) || 1)

  let invoices: Invoice[] = []
  let totalPages = 1
  let totalDocs = 0
  let clients: Client[] = []
  let settings: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findGlobal']>> | null = null

  try {
    const payload = await getPayloadClient()
    const [invRes, countRes, clRes, settingsRes] = await Promise.all([
      payload.find({
        collection: 'invoices',
        pagination: false,
        depth: 1,
        sort: '-updatedAt',
      }),
      payload.count({ collection: 'invoices' }),
      payload.find({ collection: 'clients', limit: 100, depth: 0 }),
      payload.findGlobal({ slug: 'settings' }),
    ])
    const allDocs = (invRes.docs ?? []) as Invoice[]
    const start = (page - 1) * LIST_PAGE_SIZE
    invoices = allDocs.slice(start, start + LIST_PAGE_SIZE)
    totalDocs = (countRes as { totalDocs: number })?.totalDocs ?? allDocs.length
    totalPages = totalDocs > 0 ? Math.max(1, Math.ceil(totalDocs / LIST_PAGE_SIZE)) : 1
    clients = (clRes.docs ?? []) as Client[]
    settings = settingsRes
  } catch (err) {
    console.error('[InvoicesPage] Failed to load data:', err)
    invoices = []
    totalPages = 1
    totalDocs = 0
    clients = []
    settings = null
  }

  const nextResult = await getNextInvoiceNumber()
  const nextNum = 'nextNumber' in nextResult ? nextResult.nextNumber : 1001

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
      createdAt: inv.createdAt ?? null,
      updatedAt: inv.updatedAt ?? null,
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
      initialNextInvoiceNumber={nextNum}
      totalPages={totalPages}
      totalDocs={totalDocs}
      currentPage={page}
      initialEditId={editId ?? undefined}
      initialNewInvoice={newInvoice === '1'}
    />
  )
}
