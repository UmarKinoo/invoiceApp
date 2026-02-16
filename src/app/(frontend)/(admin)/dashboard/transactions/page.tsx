import { getPayloadClient } from '@/lib/payload-server'
import { AddTransactionForm } from './add-transaction-form'
import { TransactionsListClient } from './transactions-list-client'
import type { Transaction } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  let transactions: Transaction[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'transactions', limit: 100, depth: 1 })
    transactions = (res.docs ?? []) as Transaction[]
  } catch {
    transactions = []
  }

  const txList = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date ?? null,
    amount: Number(tx.amount) ?? 0,
    reference: tx.reference ?? null,
    method: tx.method ?? null,
    client: tx.client,
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">
            Transactions
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            View your revenue ledger and incoming payments
          </p>
        </div>
        <AddTransactionForm />
      </header>

      <TransactionsListClient initialTransactions={txList} />
    </div>
  )
}
