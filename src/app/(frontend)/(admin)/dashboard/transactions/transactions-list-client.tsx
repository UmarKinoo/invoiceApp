'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Wallet } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
}

type TxDoc = {
  id: number
  date: string | null
  amount: number
  reference?: string | null
  method?: string | null
  client?: { id: number; name?: string | null } | number | null
}

export function TransactionsListClient({
  initialTransactions,
}: {
  initialTransactions: TxDoc[]
}) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    if (deleteId == null) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/transactions/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setTransactions((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
      router.refresh()
    } catch {
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Card>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Reference
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Method
                  </th>
                  <th className="w-20 px-6 py-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const client = typeof tx.client === 'object' ? tx.client : null
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {typeof tx.date === 'string' ? tx.date.slice(0, 10) : ''}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {client && 'name' in client ? client.name : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        + {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{tx.reference ?? '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="rounded bg-muted px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                          {METHOD_LABELS[tx.method ?? 'stripe'] ?? tx.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(tx.id)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center font-medium text-muted-foreground">
            <Wallet className="size-12" />
            No transactions recorded.
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
