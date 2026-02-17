'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  StickyNote,
  FileText,
  Send,
  Mail,
  DollarSign,
  ArrowRightLeft,
  ListTodo,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  note: 'Note',
  invoice_created: 'Invoice created',
  quote_created: 'Quote created',
  quote_sent: 'Quote sent',
  task_assigned: 'Task assigned',
  task_completed: 'Task completed',
  email_sent: 'Email sent',
  status_change: 'Status change',
  payment_received: 'Payment received',
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  note: StickyNote,
  invoice_created: FileText,
  quote_created: Send,
  quote_sent: Send,
  task_assigned: ListTodo,
  task_completed: CheckCircle,
  email_sent: Mail,
  status_change: ArrowRightLeft,
  payment_received: DollarSign,
}

const TYPE_ICON_CLASSES: Record<string, string> = {
  note: 'bg-muted text-muted-foreground border-border',
  invoice_created: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  quote_created: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  quote_sent: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  task_assigned: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  task_completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  email_sent: 'bg-green-500/15 text-green-500 border-green-500/30',
  status_change: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  payment_received: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
}

type FilterValue = 'all' | 'note' | 'invoices' | 'quotes' | 'emails' | 'payments' | 'tasks'

export type ActivityDoc = {
  id: number
  type: string
  body?: string | null
  createdAt: string
  createdBy?: { id: number; email?: string } | number | null
  relatedCollection?: string | null
  relatedId?: number | null
  meta?: Record<string, unknown> | null
}

function getRelatedHref(relatedCollection: string, relatedId: number): string {
  switch (relatedCollection) {
    case 'invoices':
      return `/dashboard/invoices/${relatedId}`
    case 'quotes':
      return `/dashboard/quotes/${relatedId}`
    case 'tasks':
      return `/dashboard/tasks`
    case 'transactions':
      return `/dashboard/transactions`
    default:
      return '#'
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    const diffWeek = Math.floor(diffDay / 7)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin} min ago`
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
    if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function matchesFilter(act: ActivityDoc, filter: FilterValue): boolean {
  if (filter === 'all') return true
  if (filter === 'note') return act.type === 'note'
  if (filter === 'invoices')
    return act.type === 'invoice_created' || (act.type === 'status_change' && act.meta?.entity === 'invoice')
  if (filter === 'quotes')
    return (
      act.type === 'quote_created' ||
      act.type === 'quote_sent' ||
      (act.type === 'status_change' && act.meta?.entity === 'quote')
    )
  if (filter === 'emails') return act.type === 'email_sent'
  if (filter === 'payments') return act.type === 'payment_received'
  if (filter === 'tasks') return act.type === 'task_assigned' || act.type === 'task_completed'
  return true
}

function renderMetaSummary(act: ActivityDoc): React.ReactNode {
  const meta = act.meta
  if (!meta) return null

  switch (act.type) {
    case 'invoice_created':
      return meta.total != null ? (
        <span className="text-muted-foreground">Total: {formatCurrency(Number(meta.total))}</span>
      ) : null
    case 'quote_created':
    case 'quote_sent':
      return meta.total != null ? (
        <span className="text-muted-foreground">Total: {formatCurrency(Number(meta.total))}</span>
      ) : null
    case 'status_change':
      return (
        <span className="text-muted-foreground">
          {String(meta.oldStatus ?? '?')} → {String(meta.newStatus ?? '?')}
        </span>
      )
    case 'payment_received':
      return (
        <span className="text-muted-foreground">
          {meta.amount != null ? formatCurrency(Number(meta.amount)) : formatCurrency(0)}
          {meta.method ? ` via ${String(meta.method).replace('_', ' ')}` : ''}
          {meta.reference ? ` (${meta.reference})` : ''}
        </span>
      )
    case 'email_sent':
      return meta.to ? (
        <span className="text-muted-foreground">To: {String(meta.to)}</span>
      ) : null
    default:
      return null
  }
}

export function ClientActivitySection({
  clientId,
  initialActivities,
}: {
  clientId: string
  initialActivities: ActivityDoc[]
}) {
  const router = useRouter()
  const [activities, setActivities] = useState(initialActivities)
  const [noteBody, setNoteBody] = useState('')
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [filter, setFilter] = useState<FilterValue>('all')

  const filteredActivities = useMemo(
    () => activities.filter((a) => matchesFilter(a, filter)),
    [activities, filter]
  )

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteBody.trim()) return
    setAddStatus('loading')
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: Number(clientId),
          type: 'note',
          body: noteBody.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const doc = data.doc ?? data
      setActivities((prev) => [
        {
          id: doc.id,
          type: 'note',
          body: doc.body ?? noteBody.trim(),
          createdAt: doc.createdAt ?? new Date().toISOString(),
          createdBy: doc.createdBy ?? null,
          relatedCollection: null,
          relatedId: null,
          meta: null,
        },
        ...prev,
      ])
      setNoteBody('')
      router.refresh()
    } catch {
      setAddStatus('error')
    } finally {
      setAddStatus('idle')
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-black text-white uppercase tracking-tight">Activity</h3>

      <form onSubmit={handleAddNote} className="space-y-3">
        <Textarea
          placeholder="Add a note..."
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
          className="resize-none rounded-xl border-input bg-background"
        />
        <Button type="submit" disabled={addStatus === 'loading' || !noteBody.trim()} size="sm">
          {addStatus === 'loading' ? 'Adding...' : 'Add note'}
        </Button>
        {addStatus === 'error' && (
          <p className="text-xs text-rose-400">Failed to add note. Try again.</p>
        )}
      </form>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)} className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="flex-1 min-w-0 text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="note" className="flex-1 min-w-0 text-xs">
            Notes
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex-1 min-w-0 text-xs">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex-1 min-w-0 text-xs">
            Quotes
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex-1 min-w-0 text-xs">
            Emails
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 min-w-0 text-xs">
            Payments
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 min-w-0 text-xs">
            Tasks
          </TabsTrigger>
        </TabsList>

        <TooltipProvider delayDuration={200}>
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-5 top-2 bottom-2 w-px bg-border"
              aria-hidden
            />

            <div className="space-y-0">
              {filteredActivities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity in this filter.</p>
              ) : (
                filteredActivities.map((act) => {
                  const Icon = TYPE_ICONS[act.type] ?? StickyNote
                  const iconClasses = TYPE_ICON_CLASSES[act.type] ?? TYPE_ICON_CLASSES.note
                  const linkHref =
                    act.relatedCollection && act.relatedId != null
                      ? getRelatedHref(act.relatedCollection, act.relatedId)
                      : null
                  const linkLabel = linkHref
                    ? act.relatedCollection === 'invoices'
                      ? `Invoice ${act.meta?.invoiceNumber ?? act.relatedId ?? ''}`
                      : act.relatedCollection === 'quotes'
                        ? `Quote ${act.meta?.quoteNumber ?? act.relatedId ?? ''}`
                        : act.relatedCollection === 'tasks'
                          ? 'View task'
                          : act.relatedCollection === 'transactions'
                            ? 'View transaction'
                            : null
                    : null

                  return (
                    <div
                      key={act.id}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {/* Icon node on timeline */}
                      <div
                        className={cn(
                          'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2',
                          iconClasses
                        )}
                      >
                        <Icon className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                            {TYPE_LABELS[act.type] ?? act.type}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground cursor-default">
                                {formatRelativeTime(act.createdAt)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {formatFullDate(act.createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {linkHref && linkLabel && (
                          <p className="mt-1">
                            <Link
                              href={linkHref}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {linkLabel}
                            </Link>
                          </p>
                        )}

                        {act.body && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{act.body}</p>
                        )}

                        {renderMetaSummary(act) && (
                          <p className="mt-1 text-sm">{renderMetaSummary(act)}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </TooltipProvider>
      </Tabs>
    </div>
  )
}
