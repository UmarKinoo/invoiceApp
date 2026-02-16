'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'

type QuoteDoc = {
  id: number
  quoteNumber: string | null
  date: string | null
  status: string | null
  total: number
  client?: { id: number; name?: string | null; company?: string | null } | number | null
}

type ClientDoc = { id: number; name?: string | null }

export function QuotesListClient({
  initialQuotes,
  clients,
}: {
  initialQuotes: QuoteDoc[]
  clients: ClientDoc[]
}) {
  const router = useRouter()
  const [quotes, setQuotes] = useState(initialQuotes)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const getClientName = (clientId: number | { id: number; name?: string } | undefined) => {
    if (!clientId) return 'Unknown'
    if (typeof clientId === 'object') return clientId?.name ?? 'Unknown'
    const c = clients.find((x) => x.id === clientId)
    return c?.name ?? 'Unknown'
  }

  const getClientCompany = (client: QuoteDoc['client']) => {
    if (client && typeof client === 'object' && 'company' in client) return client.company ?? '—'
    return '—'
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/quotes/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setQuotes((prev) => prev.filter((q) => q.id !== deleteId))
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
      {quotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((q) => {
            const client = typeof q.client === 'object' ? q.client : null
            return (
              <Card key={q.id} className="transition-colors hover:bg-card/80">
                <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <Link
                      href={`/dashboard/quotes/${q.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {q.quoteNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {typeof q.date === 'string' ? q.date.slice(0, 10) : ''}
                    </p>
                  </div>
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase text-amber-600 dark:text-amber-400">
                    {q.status}
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  {client && 'name' in client ? client.name : getClientName(q.client as number)}
                </p>
                <p className="mb-6 truncate text-xs text-muted-foreground">
                  {getClientCompany(q.client)}
                </p>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xl font-semibold text-foreground">
                    ${Number(q.total).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/quotes/${q.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteId(q.id)}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="py-24 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl border border-border bg-muted/50 text-muted-foreground">
            <FileText className="size-10" />
          </div>
          <p className="mb-4 font-medium text-muted-foreground">No quotes yet.</p>
          <Link
            href="/dashboard/quotes/new"
            className="text-sm font-medium text-primary hover:underline"
          >
            Create first quote
          </Link>
        </div>
      )}

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
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
    </>
  )
}
