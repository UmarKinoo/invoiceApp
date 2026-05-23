import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import { getPayloadClient } from '@/lib/payload-server'
import { invoiceReviewPath, invoiceReviewUrl } from '@/lib/agent/urls'
import { getToolContext } from './context'

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
})

const createInvoiceArgsSchema = z.object({
  clientId: z.number().int().positive().describe('Payload client ID. Use find_client first if unknown.'),
  items: z.array(lineItemSchema).min(1).describe('Line items. Each requires description, quantity, rate.'),
  dueDate: z
    .string()
    .describe('ISO date (YYYY-MM-DD) for invoice due date. Default to 30 days from today if user did not specify.'),
  date: z.string().optional().describe('Invoice issue date (ISO). Defaults to today.'),
  taxRatePercent: z.number().min(0).max(100).optional().describe('Override tax %. Defaults to workspace setting.'),
  discount: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent']).optional().describe('Defaults to "draft". Use "sent" only after explicit user confirmation.'),
})

async function computeNextInvoiceNumber(prefix: string): Promise<string> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'invoices',
    limit: 5000,
    depth: 0,
    pagination: false,
    where: { invoiceNumber: { like: `${prefix}%` } },
  })
  const max = Math.max(
    1000,
    ...result.docs.map((inv: { invoiceNumber?: string | null }) => {
      const tail = (inv.invoiceNumber ?? '').slice(prefix.length)
      const m = tail.match(/^\d+/)
      return m ? parseInt(m[0], 10) : 1000
    }),
  )
  return `${prefix}${max + 1}`
}

export const createInvoiceTool = tool(
  async (input, config): Promise<string> => {
    const args = createInvoiceArgsSchema.parse(input)
    const { userId } = getToolContext(config as LangGraphRunnableConfig)
    const payload = await getPayloadClient()

    const settings = await payload.findGlobal({ slug: 'settings' })
    const prefix = (settings?.invoicePrefix as string) ?? 'INV-'
    const defaultTax = (settings?.taxRateDefault as number) ?? 0
    const taxRate = args.taxRatePercent ?? defaultTax

    const subtotal = args.items.reduce((acc, it) => acc + it.quantity * it.rate, 0)
    const tax = (subtotal * taxRate) / 100
    const total = subtotal + tax + (args.shipping ?? 0) - (args.discount ?? 0)
    const today = new Date().toISOString().slice(0, 10)

    let attempt = 0
    let invoiceNumber = await computeNextInvoiceNumber(prefix)

    while (attempt < 5) {
      try {
        const doc = await payload.create({
          collection: 'invoices',
          data: {
            invoiceNumber,
            client: args.clientId,
            date: args.date ?? today,
            dueDate: args.dueDate,
            items: args.items,
            status: args.status ?? 'draft',
            taxRate,
            discount: args.discount ?? 0,
            shipping: args.shipping ?? 0,
            notes: args.notes,
            subtotal,
            tax,
            total,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          user: { id: userId, collection: 'users' } as never,
        })
        const id = doc.id as number
        return JSON.stringify({
          ok: true,
          id,
          invoiceNumber: doc.invoiceNumber,
          total,
          status: doc.status,
          reviewPath: invoiceReviewPath(id),
          reviewUrl: invoiceReviewUrl(id),
        })
      } catch (err: unknown) {
        const e = err as { data?: { errors?: { path?: string }[] }; message?: string }
        const isInvoiceNumberConflict =
          e?.data?.errors?.some((x) => x?.path === 'invoiceNumber') ||
          (/invoiceNumber/i.test(e?.message ?? '') && /(unique|duplicate|invalid)/i.test(e?.message ?? ''))
        if (isInvoiceNumberConflict && attempt < 4) {
          attempt += 1
          invoiceNumber = await computeNextInvoiceNumber(prefix)
          continue
        }
        return JSON.stringify({
          ok: false,
          error: e?.message ?? 'Failed to create invoice',
        })
      }
    }
    return JSON.stringify({ ok: false, error: 'Gave up after repeated invoice number conflicts.' })
  },
  {
    name: 'create_invoice',
    description:
      'Create an invoice (default status "draft"). Requires a valid client ID — use find_client first. ' +
      'Always call ask_human to confirm before invoking. Returns reviewUrl — share that link with the user so they can open and review the draft.',
    schema: createInvoiceArgsSchema,
  },
)
