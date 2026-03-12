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
import { formatCurrency, formatDisplayDate } from '@/lib/utils'
import { displayInvoiceNumber } from '@/lib/invoice-utils'
import { updateInvoice, deleteInvoice } from '../actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  partial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
    discount?: number
    shipping?: number
    taxRate?: number
    carNumber?: string | null
    notes?: string | null
    items?: { description?: string; quantity?: number; rate?: number }[]
  }
  client: {
    name?: string | null
    company?: string | null
    email?: string | null
    address?: string | null
  } | null
  business: {
    businessName: string
    businessAddress: string
    businessEmail: string
    businessPhone: string
    businessBrn: string
    vatRegistrationNumber: string
    logoUrl: string | null
    logo: { url?: string } | number | null
  } | null
  deliveredBy?: string | null
  printMode?: boolean
}

function getLogoUrl(business: InvoiceDetailClientProps['business']): string | null {
  if (!business) return null
  const logo = business.logo
  if (logo && typeof logo === 'object' && logo !== null && 'url' in logo && logo.url) return logo.url
  return business.logoUrl
}

/** If carNumber is set, use it; otherwise try to extract from notes (e.g. "Car number: 3327 JZ 20"). Returns display value and notes with car lines removed. */
function getCarDisplayAndNotes(carNumber: string | null | undefined, notes: string | null | undefined): { carDisplay: string; notesForDisplay: string } {
  const car = (carNumber ?? '').trim()
  const noteText = (notes ?? '').trim()
  const lines = noteText ? noteText.split(/\r?\n/) : []
  const carLineRegex = /^\s*(?:Car number|Car)\s*:?\s*(.+)$/i
  let extractedCar = ''
  const keptLines: string[] = []
  for (const line of lines) {
    const m = line.match(carLineRegex)
    if (m) {
      const value = m[1].trim()
      if (value && !extractedCar) extractedCar = value
      continue
    }
    keptLines.push(line)
  }
  const carDisplay = car || extractedCar || '—'
  const notesForDisplay = keptLines.join('\n').trim()
  return { carDisplay, notesForDisplay }
}

export function InvoiceDetailClient({ invoice, client, business, deliveredBy, printMode = false }: InvoiceDetailClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(invoice.status ?? 'draft')
  const [statusSaving, setStatusSaving] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState(client?.email ?? '')
  const invoiceLabel = displayInvoiceNumber(invoice.invoiceNumber, String(invoice.id))
  const [emailSubject, setEmailSubject] = useState(`Invoice ${invoiceLabel}`)
  const [emailBody, setEmailBody] = useState(
    `Please find attached invoice ${invoiceLabel}. Thank you for your business.`
  )
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [downloadPdfLoading, setDownloadPdfLoading] = useState(false)

  const items = invoice.items ?? []
  const subtotal = invoice.subtotal ?? items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)
  const discount = invoice.discount ?? 0
  const shipping = invoice.shipping ?? 0
  const tax = invoice.tax ?? 0
  const logoUrl = getLogoUrl(business)
  const { carDisplay, notesForDisplay } = getCarDisplayAndNotes(invoice.carNumber, invoice.notes)

  const handleStatusChange = async (newStatus: string) => {
    setStatusSaving(true)
    const result = await updateInvoice(Number(invoice.id), { status: newStatus })
    if (result.doc) {
      setStatus(newStatus)
      router.refresh()
    }
    setStatusSaving(false)
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
          subject: emailSubject.trim() || `Invoice ${invoiceLabel}`,
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
      a.download = `invoice-${invoiceLabel || invoice.id}.pdf`
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
    const result = await deleteInvoice(Number(invoice.id))
    if (result.ok) {
      router.push('/dashboard/invoices')
      router.refresh()
    }
    setDeleteLoading(false)
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
              {invoiceLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              {client?.name ?? 'Unknown'} • {formatCurrency(Number(invoice.total))}
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

      <Card className="max-w-3xl print:shadow-none overflow-hidden">
        {/* Header: Logo + From | Tax invoice block; then Bill to */}
        <CardHeader className="px-6 py-5 space-y-5">
          <div className="flex flex-row flex-wrap items-start justify-between gap-6">
            {/* Left: larger logo only */}
            <div className="flex items-start min-w-0">
              {logoUrl ? (
                <div className="shrink-0 w-40 flex items-center justify-start">
                  <img src={logoUrl} alt="Company logo" className="max-h-20 w-full object-contain object-left" />
                </div>
              ) : (
                <div className="shrink-0 w-40 h-20 rounded-lg bg-muted/50 flex items-center justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Logo</span>
                </div>
              )}
            </div>
            {/* Right: Tax invoice + number + meta in tight block */}
            <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/90">
                Tax invoice
              </p>
              <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">
                #{invoice.invoiceNumber ?? invoice.id}
              </p>
              <div className="flex flex-col items-end gap-0.5 text-sm text-muted-foreground mt-1">
                <span>Date {formatDisplayDate(invoice.date) || '—'}</span>
                <span>Due {formatDisplayDate(invoice.dueDate) || '—'}</span>
                <span>Car {carDisplay}</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'mt-1.5 font-medium uppercase text-[10px] tracking-wide',
                  STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground border-border'
                )}
              >
                {status}
              </Badge>
            </div>
          </div>

          {/* From and Bill to on the same row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/80">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/90 mb-1">
                From
              </p>
              {business ? (
                <>
                  <p className="text-base font-semibold text-foreground leading-tight">
                    {business.businessName}
                  </p>
                  {business.businessAddress && (
                    <p className="text-sm text-muted-foreground mt-1 leading-snug whitespace-pre-line">
                      {business.businessAddress}
                    </p>
                  )}
                  {business.businessEmail && (
                    <p className="text-sm text-muted-foreground mt-0.5">{business.businessEmail}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/90 mb-1">
                Bill to
              </p>
              <p className="text-base font-semibold text-foreground">{client?.name ?? '—'}</p>
              {client?.company && (
                <p className="text-sm text-muted-foreground mt-0.5">{client.company}</p>
              )}
              {client?.email && (
                <p className="text-sm text-muted-foreground mt-0.5">{client.email}</p>
              )}
              {client?.address && (
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{client.address}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-[420px] px-6 pb-6">
          <div className="flex-1 min-h-0">
            <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-20">
                  Qty
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-28">
                  Price
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-28">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="py-4">
                    <p className="text-sm font-medium text-foreground">{item.description ?? '—'}</p>
                  </TableCell>
                  <TableCell className="py-4 text-right text-sm text-muted-foreground">
                    {item.quantity ?? 0}
                  </TableCell>
                  <TableCell className="py-4 text-right text-sm text-muted-foreground">
                    {formatCurrency(Number(item.rate ?? 0))}
                  </TableCell>
                  <TableCell className="py-4 text-right text-sm font-medium text-foreground">
                    {formatCurrency((item.quantity ?? 0) * (item.rate ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="shrink-0 pt-4 mt-auto space-y-2 border-t border-border/80">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>VAT ({invoice.taxRate ?? 15}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Shipping</span>
                <span>{formatCurrency(shipping)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-primary pt-2">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-mono text-base tabular-nums sm:text-lg">{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>
          {(business || deliveredBy) && (
            <footer className="mt-4 pt-4 border-t border-border/80 rounded-lg bg-muted/30 px-5 py-4">
              <div className="flex flex-wrap items-end justify-between gap-6">
                {business && (
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/90">
                      Payment details
                    </p>
                    <p className="text-sm text-foreground">
                      Cheque to <span className="font-semibold">{business.businessName || '—'}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      {business.businessPhone && <span>T {business.businessPhone}</span>}
                      {business.businessBrn && <span>BRN {business.businessBrn}</span>}
                      {business.vatRegistrationNumber && (
                        <span>VAT {business.vatRegistrationNumber}</span>
                      )}
                    </div>
                  </div>
                )}
                {deliveredBy && (
                  <div className="text-right min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/90">
                      Delivered by
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{deliveredBy}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Powered by</span>
                <div className="flex items-center gap-1">
                  <img src="/swiftbook-icon.png" alt="" className="h-4 w-4 object-contain shrink-0" aria-hidden />
                  <span className="text-sm font-semibold tracking-tight text-muted-foreground">Swiftbook</span>
                </div>
              </div>
            </footer>
          )}
          {!business && !deliveredBy ? (
            <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Powered by</span>
              <div className="flex items-center gap-1">
                <img src="/swiftbook-icon.png" alt="" className="h-4 w-4 object-contain shrink-0" aria-hidden />
                <span className="text-sm font-semibold tracking-tight text-muted-foreground">Swiftbook</span>
              </div>
            </div>
          ) : null}
          {notesForDisplay ? (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </Label>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{notesForDisplay}</p>
              </div>
            </>
          ) : null}
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
              Email invoice {invoiceLabel} to the client. You can edit the recipient and message below.
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
