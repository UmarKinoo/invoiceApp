'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, FileText, Trash2, Loader2 } from 'lucide-react'
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

type QuoteDetailClientProps = {
  quote: {
    id: number
    quoteNumber: string | null
    date: string | null
    status: string | null
    total: number
    items: { description?: string; quantity?: number; rate?: number }[]
    clientId?: number | null
  }
  client: {
    name?: string | null
    company?: string | null
    email?: string | null
  } | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

export function QuoteDetailClient({ quote, client }: QuoteDetailClientProps) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createInvoiceLoading, setCreateInvoiceLoading] = useState(false)

  const items = quote.items ?? []
  const subtotal = items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard/quotes')
      router.refresh()
    } catch {
      setDeleteLoading(false)
    }
  }

  const clientIdForInvoice = quote.clientId ?? null

  const handleCreateInvoice = async () => {
    if (clientIdForInvoice == null) return
    setCreateInvoiceLoading(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: clientIdForInvoice,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: quote.items.map((i) => ({
            description: i.description ?? '',
            quantity: i.quantity ?? 0,
            rate: i.rate ?? 0,
          })),
          status: 'draft',
          taxRate: 0,
          discount: 0,
          shipping: 0,
          notes: `Created from quote ${quote.quoteNumber ?? ''}`,
          subtotal,
          tax: 0,
          total: quote.total,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const newId = data.doc?.id ?? data.id
      if (newId) {
        router.push(`/dashboard/invoices/${newId}`)
        router.refresh()
      }
    } catch {
      setCreateInvoiceLoading(false)
    } finally {
      setCreateInvoiceLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/quotes">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {quote.quoteNumber}
            </h2>
            <p className="text-sm text-muted-foreground">
              {client?.name ?? 'Unknown'} • {formatCurrency(Number(quote.total))}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotes/${quote.id}/edit`} className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          {clientIdForInvoice != null && (
            <Button
              size="sm"
              onClick={handleCreateInvoice}
              disabled={createInvoiceLoading}
              className="gap-2"
            >
              {createInvoiceLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Create invoice from quote
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      <Card className="max-w-3xl">
        <CardContent className="p-6 lg:p-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Bill To
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              {client?.name ?? '—'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {client?.company ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <span
              className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase border ${
                STATUS_BADGE[quote.status ?? ''] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }`}
            >
              {quote.status}
            </span>
          </div>
        </div>
        <table className="mb-8 w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Item
              </th>
              <th className="py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-4">
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.quantity} × {formatCurrency(Number(item.rate))}
                  </p>
                </td>
                <td className="py-4 text-right text-sm font-medium text-foreground">
                  {formatCurrency((item.quantity ?? 0) * (item.rate ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-primary">
          <span className="uppercase tracking-wider">Total</span>
          <span className="text-xl">{formatCurrency(Number(quote.total))}</span>
        </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
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
    </div>
  )
}
