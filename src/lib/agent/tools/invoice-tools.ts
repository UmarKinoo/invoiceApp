import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload-server'
import { invoiceReviewPath, invoiceReviewUrl } from '@/lib/agent/urls'
import { getToolContext } from './context'

const invoiceStatusSchema = z.enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'])

function serializeInvoiceSummary(inv: {
  id: number
  invoiceNumber?: string | null
  status?: string | null
  total?: number | null
  date?: string | null
  dueDate?: string | null
  client?: number | { id: number; name?: string } | null
}) {
  const client =
    inv.client == null
      ? null
      : typeof inv.client === 'object'
        ? { id: inv.client.id, name: inv.client.name ?? null }
        : { id: inv.client, name: null }

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber ?? null,
    status: inv.status ?? null,
    total: inv.total ?? null,
    date: inv.date ?? null,
    dueDate: inv.dueDate ?? null,
    client,
    reviewPath: invoiceReviewPath(inv.id),
    reviewUrl: invoiceReviewUrl(inv.id),
  }
}

export const findInvoiceTool = tool(
  async ({ query, clientId, status, limit }): Promise<string> => {
    const payload = await getPayloadClient()
    const cap = limit ?? 10
    const and: Where[] = []

    if (clientId != null) {
      and.push({ client: { equals: clientId } })
    }
    if (status) {
      and.push({ status: { equals: status } })
    }

    const or: Where[] = []
    const trimmed = query?.trim() ?? ''

    if (trimmed) {
      or.push({ invoiceNumber: { like: trimmed } })
      const idMatch = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null
      if (idMatch != null) {
        or.push({ id: { equals: idMatch } })
      }
      const clients = await payload.find({
        collection: 'clients',
        limit: 10,
        where: {
          or: [
            { name: { like: trimmed } },
            { company: { like: trimmed } },
            { email: { like: trimmed } },
          ],
        },
      })
      const clientIds = clients.docs.map((c) => c.id)
      if (clientIds.length > 0) {
        or.push({ client: { in: clientIds } })
      }
    }

    if (or.length > 0) {
      and.push({ or: or as Where[] })
    }

    const result = await payload.find({
      collection: 'invoices',
      limit: cap,
      depth: 1,
      sort: '-updatedAt',
      ...(and.length > 0 ? { where: { and } } : {}),
    })

    const matches = result.docs.map((inv) => serializeInvoiceSummary(inv as never))

    if (matches.length === 0) {
      return JSON.stringify({
        matches: [],
        hint: 'No invoices matched. Try find_client first, or a different invoice number / status filter.',
      })
    }
    return JSON.stringify({ matches })
  },
  {
    name: 'find_invoice',
    description:
      'Search invoices by invoice number fragment, numeric id, client name/company (fuzzy), and/or filters. ' +
      'Use clientId when you already have it from find_client. Never invent invoice IDs.',
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe('Invoice number, id, or client name fragment. Omit to list by filters only.'),
      clientId: z.number().int().positive().optional().describe('Filter to one client'),
      status: invoiceStatusSchema.optional().describe('Filter by status'),
      limit: z.number().int().positive().max(25).optional().describe('Max results (default 10)'),
    }),
  },
)

export const getInvoiceTool = tool(
  async ({ invoiceId }): Promise<string> => {
    const payload = await getPayloadClient()
    try {
      const inv = await payload.findByID({
        collection: 'invoices',
        id: invoiceId,
        depth: 1,
      })
      const items = (inv.items ?? []).map(
        (it: { description?: string; quantity?: number; rate?: number }) => ({
          description: it.description ?? '',
          quantity: it.quantity ?? 0,
          rate: it.rate ?? 0,
          lineTotal: (it.quantity ?? 0) * (it.rate ?? 0),
        }),
      )
      return JSON.stringify({
        ok: true,
        invoice: {
          ...serializeInvoiceSummary(inv as never),
          subtotal: inv.subtotal ?? null,
          tax: inv.tax ?? null,
          taxRate: inv.taxRate ?? null,
          discount: inv.discount ?? null,
          shipping: inv.shipping ?? null,
          notes: inv.notes ?? null,
          items,
        },
      })
    } catch {
      return JSON.stringify({ ok: false, error: `Invoice ${invoiceId} not found.` })
    }
  },
  {
    name: 'get_invoice',
    description:
      'Load one invoice by Payload id (line items, totals, client, status). Use find_invoice if the id is unknown.',
    schema: z.object({
      invoiceId: z.number().int().positive().describe('Payload invoice id from find_invoice'),
    }),
  },
)

export const updateInvoiceStatusTool = tool(
  async (input, config): Promise<string> => {
    const args = z
      .object({
        invoiceId: z.number().int().positive(),
        status: invoiceStatusSchema,
      })
      .parse(input)

    const { userId } = getToolContext(config as LangGraphRunnableConfig)
    const payload = await getPayloadClient()

    try {
      const previous = await payload.findByID({
        collection: 'invoices',
        id: args.invoiceId,
        depth: 0,
      })
      const doc = await payload.update({
        collection: 'invoices',
        id: args.invoiceId,
        data: { status: args.status },
        user: { id: userId, collection: 'users' } as never,
      })
      return JSON.stringify({
        ok: true,
        id: doc.id,
        invoiceNumber: doc.invoiceNumber,
        previousStatus: previous.status,
        status: doc.status,
        reviewUrl: invoiceReviewUrl(doc.id as number),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed'
      return JSON.stringify({ ok: false, error: message })
    }
  },
  {
    name: 'update_invoice_status',
    description:
      'Change an invoice status (e.g. draft → sent, sent → paid, → cancelled). ' +
      'Requires invoice id from find_invoice or get_invoice. Always call ask_human to confirm before invoking.',
    schema: z.object({
      invoiceId: z.number().int().positive(),
      status: invoiceStatusSchema.describe('New status'),
    }),
  },
)
