'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wallet, ArrowDownCircle, ArrowUpCircle, FileText, Trash2, AlertCircle } from 'lucide-react'
import { deleteTransaction } from './actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
}

type TxDoc = {
  id: number
  type: 'income' | 'expense'
  date: string | null
  amount: number
  reference?: string | null
  method?: string | null
  notes?: string | null
  client?: { id: number; name?: string | null } | number | null
  invoice?: { id: number; invoiceNumber?: string | null } | null
}

type ReconRow = {
  id: number
  invoiceNumber: string | null
  total: number
  paid: number
  amountDue: number
  status: string | null
  client?: unknown
}

export function LedgerPageClient({
  initialTransactions,
  reconciliation,
  summary,
  unmatchedCount,
}: {
  initialTransactions: TxDoc[]
  reconciliation: ReconRow[]
  summary: { revenue: number; expenses: number; outstanding: number }
  unmatchedCount: number
}) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    if (deleteId == null) return
    setDeleteLoading(true)
    const result = await deleteTransaction(deleteId)
    if (result.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
      router.refresh()
    }
    setDeleteLoading(false)
  }

  const unmatched = transactions.filter((t) => t.type === 'income' && !t.invoice)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        <Card className="relative overflow-hidden py-0 transition-colors hover:bg-card/80">
          <CardContent className="flex flex-col gap-2 p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <ArrowDownCircle className="size-5" />
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.revenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden py-0 transition-colors hover:bg-card/80">
          <CardContent className="flex flex-col gap-2 p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <ArrowUpCircle className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Expenses</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden py-0 transition-colors hover:bg-card/80">
          <CardContent className="flex flex-col gap-2 p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <FileText className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outstanding</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {formatCurrency(summary.outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden py-0 transition-colors hover:bg-card/80">
          <CardContent className="flex flex-col gap-2 p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net (P&L)</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {formatCurrency(summary.revenue - summary.expenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
          <TabsTrigger value="recon">By invoice</TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched {unmatchedCount > 0 && `(${unmatchedCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Type
                      </th>
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
                        Invoice
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
                      const invNum = tx.invoice && typeof tx.invoice === 'object' ? tx.invoice.invoiceNumber : null
                      const invId = tx.invoice && typeof tx.invoice === 'object' ? tx.invoice.id : null
                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <span
                              className={
                                tx.type === 'income'
                                  ? 'rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-medium uppercase text-emerald-600 dark:text-emerald-400'
                                  : 'rounded bg-rose-500/20 px-2 py-1 text-[10px] font-medium uppercase text-rose-600 dark:text-rose-400'
                              }
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                            {typeof tx.date === 'string' ? tx.date.slice(0, 10) : ''}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {client && 'name' in client ? client.name : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold tabular-nums">
                            {tx.type === 'income' ? (
                              <span className="text-emerald-600 dark:text-emerald-400">+ {formatCurrency(tx.amount)}</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">− {formatCurrency(tx.amount)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {invId ? (
                              <Link
                                href={`/dashboard/invoices?edit=${invId}`}
                                className="text-primary hover:underline"
                              >
                                {invNum ?? `#${invId}`}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
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
                No transactions yet.
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="space-y-4">
          <Card>
            <CardHeader>
              <p className="text-sm text-muted-foreground">
                Invoices with total, paid amount, and amount due. Status updates when you link payments.
              </p>
            </CardHeader>
            {reconciliation.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Invoice
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Total
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Paid
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reconciliation.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/invoices?edit=${row.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.invoiceNumber ?? `#${row.id}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded bg-muted px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                            {row.status ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm tabular-nums text-foreground">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.paid)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(row.amountDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardContent className="flex flex-col items-center gap-4 p-12 text-center font-medium text-muted-foreground">
                <FileText className="size-12" />
                No invoices to reconcile.
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="unmatched" className="space-y-4">
          <Card>
            <CardHeader>
              <p className="text-sm text-muted-foreground">
                Income transactions not linked to an invoice. Link them from the table or when logging a payment.
              </p>
            </CardHeader>
            {unmatched.length > 0 ? (
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
                      <th className="w-20 px-6 py-4 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unmatched.map((tx) => {
                      const client = typeof tx.client === 'object' ? tx.client : null
                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {typeof tx.date === 'string' ? tx.date.slice(0, 10) : ''}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {client && 'name' in client ? client.name : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            + {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{tx.reference ?? '—'}</td>
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
                <AlertCircle className="size-12" />
                No unmatched income. All payments are linked to invoices.
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Linked invoice status may update.</AlertDialogDescription>
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
