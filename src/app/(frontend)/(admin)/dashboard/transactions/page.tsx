import { getPayloadClient } from '@/lib/payload-server'
import { AddTransactionForm } from './add-transaction-form'
import { LedgerPageClient } from './ledger-page-client'
import type { Transaction, Invoice } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  let transactions: Transaction[] = []
  let invoices: Invoice[] = []
  try {
    const payload = await getPayloadClient()
    const invRes = await payload.find({
      collection: 'invoices',
      pagination: false,
      depth: 0,
      sort: '-updatedAt',
    })
    invoices = (invRes.docs ?? []) as Invoice[]
  } catch {
    invoices = []
  }
  try {
    const payload = await getPayloadClient()
    const txRes = await payload.find({
      collection: 'transactions',
      pagination: false,
      depth: 1,
      sort: '-date',
    })
    transactions = (txRes.docs ?? []) as Transaction[]
  } catch {
    transactions = []
  }

  const txList = transactions.map((tx) => {
    const inv = tx.invoice
    return {
      id: tx.id,
      type: (tx as { type?: 'income' | 'expense' }).type ?? 'income',
      date: tx.date ?? null,
      amount: Number(tx.amount) ?? 0,
      reference: tx.reference ?? null,
      method: (tx as { method?: string }).method ?? null,
      notes: (tx as { notes?: string | null }).notes ?? null,
      client: tx.client,
      invoice: inv
        ? typeof inv === 'object' && inv != null && 'id' in inv
          ? { id: (inv as { id: number }).id, invoiceNumber: (inv as { invoiceNumber?: string }).invoiceNumber ?? null }
          : { id: inv as number, invoiceNumber: null }
        : null,
    }
  })

  // Per-invoice: paid = from linked tx, or from status 'paid' when no tx data
  const invoicePayments = new Map<number, number>()
  for (const tx of txList) {
    if (tx.type !== 'income' || !tx.invoice) continue
    const id = typeof tx.invoice === 'object' ? tx.invoice.id : tx.invoice
    invoicePayments.set(id, (invoicePayments.get(id) ?? 0) + tx.amount)
  }
  const reconciliation = invoices
    .filter((inv) => inv.status !== 'cancelled')
    .map((inv) => {
      const total = Number(inv.total) ?? 0
      let paid = invoicePayments.get(inv.id) ?? 0
      if (txList.length === 0 && inv.status === 'paid') paid = total
      const amountDue = Math.max(0, total - paid)
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber ?? null,
        total,
        paid,
        amountDue,
        status: inv.status ?? null,
        client: inv.client,
      }
    })
    .sort((a, b) => (b.amountDue !== a.amountDue ? b.amountDue - a.amountDue : 0))

  const revenue =
    txList.length > 0
      ? txList.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      : invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (Number(i.total) ?? 0), 0)
  const expenses = txList.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const outstanding = reconciliation.reduce((s, r) => s + r.amountDue, 0)
  const unmatched = txList.filter((t) => t.type === 'income' && !t.invoice)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">
            Ledger
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Income, expenses, and invoice reconciliation
          </p>
        </div>
        <AddTransactionForm
          invoices={invoices.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber ?? null }))}
        />
      </header>

      <LedgerPageClient
        initialTransactions={txList}
        reconciliation={reconciliation}
        summary={{ revenue, expenses, outstanding }}
        unmatchedCount={unmatched.length}
      />
    </div>
  )
}
