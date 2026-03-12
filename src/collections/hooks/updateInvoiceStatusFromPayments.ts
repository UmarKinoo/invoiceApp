import type { Payload } from 'payload'

/**
 * Recompute invoice status from linked transactions.
 * Sum all transactions for this invoice; set status to paid / partial / overdue / sent.
 */
export async function updateInvoiceStatusFromPayments(
  payload: Payload,
  invoiceId: number,
): Promise<void> {
  try {
    const invoice = await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 0,
    })
    if (!invoice) return

    const total = Number(invoice.total) ?? 0
    if (total <= 0) return

    const txRes = await payload.find({
      collection: 'transactions',
      where: { invoice: { equals: invoiceId } },
      limit: 1000,
      depth: 0,
    })
    const paid = (txRes.docs ?? []).reduce((sum, t) => sum + (Number(t.amount) ?? 0), 0)

    let status: 'paid' | 'partial' | 'overdue' | 'sent' | 'draft' | 'cancelled' = invoice.status as never
    if (invoice.status === 'cancelled') return

    if (paid >= total) {
      status = 'paid'
    } else if (paid > 0) {
      status = 'partial'
    } else {
      const due = invoice.dueDate ? new Date(invoice.dueDate).getTime() : 0
      status = due < Date.now() ? 'overdue' : (invoice.status === 'draft' ? 'draft' : 'sent')
    }

    if (status === invoice.status) return

    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: { status },
    })
  } catch (err) {
    console.error('[updateInvoiceStatusFromPayments]', err)
  }
}
