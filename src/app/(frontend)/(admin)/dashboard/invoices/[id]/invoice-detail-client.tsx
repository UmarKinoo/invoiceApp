'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Mail, Printer, Pencil, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  overdue: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
}

type InvoiceDetailClientProps = {
  invoice: {
    id: number | string
    invoiceNumber: string | null
    date: string | null
    dueDate?: string | null
    status: string | null
    total: number
    subtotal?: number
    tax?: number
    carNumber?: string | null
    notes?: string | null
    items?: { description?: string; quantity?: number; rate?: number }[]
  }
  client: {
    name?: string | null
    company?: string | null
    email?: string | null
  } | null
  printMode?: boolean
}

export function InvoiceDetailClient({ invoice, client, printMode = false }: InvoiceDetailClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(invoice.status ?? 'draft')
  const [statusSaving, setStatusSaving] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState(client?.email ?? '')
  const [emailSubject, setEmailSubject] = useState(`Invoice ${invoice.invoiceNumber ?? ''}`)
  const [emailBody, setEmailBody] = useState(
    `Please find attached invoice ${invoice.invoiceNumber ?? ''}. Thank you for your business.`
  )
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [downloadPdfLoading, setDownloadPdfLoading] = useState(false)

  const items = invoice.items ?? []
  const subtotal = invoice.subtotal ?? items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)

  const handleStatusChange = async (newStatus: string) => {
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus(newStatus)
      router.refresh()
    } catch {
      // keep current status
    } finally {
      setStatusSaving(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!emailTo?.trim()) return
    setSendStatus('loading')
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: emailSubject.trim() || `Invoice ${invoice.invoiceNumber ?? ''}`,
          body: emailBody.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed')
      setSendStatus('done')
      setShowEmailModal(false)
      setStatus('sent')
      router.refresh()
    } catch {
      setSendStatus('error')
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadPdfLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoiceNumber ?? invoice.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Could show toast or inline error
    } finally {
      setDownloadPdfLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard/invoices')
      router.refresh()
    } catch {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${printMode ? 'print-only-content' : ''}`}>
      <header className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${printMode ? 'hidden' : ''} print:hidden`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {invoice.invoiceNumber}
            </h2>
            <p className="text-sm text-muted-foreground">
              {client?.name ?? 'Unknown'} • ${Number(invoice.total).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadPdfLoading}
            className="gap-2"
          >
            <Download className="size-4" />
            {downloadPdfLoading ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button size="sm" onClick={() => setShowEmailModal(true)} className="gap-2">
            <Mail className="size-4" />
            Send Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="size-4" />
            Print
          </Button>
          <Select value={status} onValueChange={handleStatusChange} disabled={statusSaving}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={`/dashboard/invoices?edit=${invoice.id}`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      <Card className="max-w-3xl print:shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b px-6 pb-6 pt-0">
          <div className="space-y-1">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Bill To
            </CardTitle>
            <p className="text-lg font-semibold text-foreground">
              {client?.name ?? '—'}
            </p>
            <CardDescription className="mt-0">
              {client?.company ?? '—'}
            </CardDescription>
          </div>
          <CardAction className="text-right">
            <Label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </Label>
            <Badge
              variant="outline"
              className={cn(
                'font-semibold uppercase',
                STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground border-border'
              )}
            >
              {status}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Item
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="py-4">
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.quantity} × ${Number(item.rate).toFixed(2)}
                    </p>
                  </TableCell>
                  <TableCell className="py-4 text-right text-sm font-medium text-foreground">
                    ${((item.quantity ?? 0) * (item.rate ?? 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-primary">
              <span className="uppercase tracking-wider">Total</span>
              <span className="text-xl">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
          {invoice.carNumber && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Car number
                </Label>
                <p className="text-sm text-muted-foreground">{invoice.carNumber}</p>
              </div>
            </>
          )}
          {invoice.notes && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </Label>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The invoice will be permanently removed.
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

      <Dialog open={showEmailModal} onOpenChange={(open) => {
        setShowEmailModal(open)
        if (!open) setSendStatus('idle')
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Email invoice {invoice.invoiceNumber ?? ''} to the client. You can edit the recipient and message below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            {sendStatus === 'error' && (
              <p className="text-sm text-destructive">
                Failed to send. Check email config or try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailModal(false)
                setSendStatus('idle')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvoice}
              disabled={sendStatus === 'loading' || !emailTo?.trim()}
            >
              {sendStatus === 'loading' ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
