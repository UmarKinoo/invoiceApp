import type { Payload } from 'payload'

function getClientId(client: number | { id: number } | null | undefined): number | null {
  if (client == null) return null
  return typeof client === 'object' ? client.id : client
}

/**
 * When an invoice is marked paid, create a transaction for the remaining balance
 * (total - sum of existing linked transactions) so the ledger stays in sync.
 */
export async function createPaymentTransactionWhenPaid(
  payload: Payload,
  invoiceDoc: { id: number; total?: number | null; client?: number | { id: number } | null },
): Promise<void> {
  try {
    const total = Number(invoiceDoc.total) ?? 0
    if (total <= 0) return

    const clientId = getClientId(invoiceDoc.client)
    if (!clientId) return

    const txRes = await payload.find({
      collection: 'transactions',
      where: { invoice: { equals: invoiceDoc.id } },
      limit: 1000,
      depth: 0,
    })
    const paid = (txRes.docs ?? []).reduce((sum, t) => sum + (Number(t.amount) ?? 0), 0)
    const remaining = total - paid
    if (remaining <= 0) return

    const today = new Date().toISOString().slice(0, 10)
    await payload.create({
      collection: 'transactions',
      data: {
        type: 'income',
        date: today,
        amount: remaining,
        invoice: invoiceDoc.id,
        client: clientId,
        reference: undefined,
        method: 'bank_transfer',
        notes: `Auto-created when invoice marked paid (remaining balance)`,
      },
    })
  } catch (err) {
    console.error('[createPaymentTransactionWhenPaid]', err)
  }
}
