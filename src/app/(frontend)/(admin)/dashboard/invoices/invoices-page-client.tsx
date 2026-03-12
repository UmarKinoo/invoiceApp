'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  Plus,
  Receipt,
  Search,
  Share2,
  Sparkles,
  X,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { displayInvoiceNumber } from '@/lib/invoice-utils'
import { createClient } from '../clients/actions'
import { getNextInvoiceNumber, createInvoice, updateInvoice, deleteInvoice, bulkUpdateInvoiceStatus } from './actions'
import { parseInvoicePrompt } from '../actions/ai'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { ListPagination } from '@/components/dashboard/list-pagination'

// Legacy Invoices layout – same as _legacy/pages/Invoices.tsx: LIST / FORM / PREVIEW on one page

type LineItem = { id: string; description: string; quantity: number; rate: number }

type ClientDoc = { id: string; name: string | null; company?: string | null; email?: string | null }
type InvoiceDoc = {
  id: string
  invoiceNumber: string | null
  date: string | null
  dueDate?: string | null
  status: string | null
  taxRate?: number | null
  discount?: number | null
  shipping?: number | null
  carNumber?: string | null
  notes?: string | null
  total: number
  client?: { id: string; name?: string | null; company?: string | null } | string | number
  createdAt?: string | null
  updatedAt?: string | null
}
type SettingsDoc = {
  businessName: string
  businessAddress: string
  businessEmail: string
  logoUrl?: string | null
  invoicePrefix: string
  taxRateDefault: number
  currency: string
}

const STATUS_STYLE: Record<string, string> = {
  paid: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  partial: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  overdue: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  draft: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  sent: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  cancelled: 'text-slate-500 border-slate-500/20 bg-slate-500/5',
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  draft: 'Draft',
  sent: 'Sent',
  cancelled: 'Cancelled',
}

enum ViewMode {
  LIST,
  FORM,
  PREVIEW,
}

const defaultSettings: SettingsDoc = {
  businessName: '',
  businessAddress: '',
  businessEmail: '',
  logoUrl: null,
  invoicePrefix: 'INV-',
  taxRateDefault: 0,
  currency: 'MUR',
}

const DRAFT_KEY = 'invoiceApp_invoice_draft'

function loadInvoiceDraft(): { activeInvoice: Partial<InvoiceDoc> & { clientId?: string }; items: LineItem[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { activeInvoice?: unknown; items?: LineItem[] }
    if (parsed?.activeInvoice && Array.isArray(parsed.items) && parsed.items.length > 0) {
      return {
        activeInvoice: parsed.activeInvoice as Partial<InvoiceDoc> & { clientId?: string },
        items: parsed.items,
      }
    }
  } catch {
    // ignore
  }
  return null
}

function saveInvoiceDraft(activeInvoice: Partial<InvoiceDoc> & { clientId?: string }, items: LineItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ activeInvoice, items, savedAt: Date.now() })
    )
  } catch {
    // ignore
  }
}

function clearInvoiceDraft() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

/** Badge: show numeric part or id so we never show only "#". Handles "214", "INV-1001", "INV-1101-md2lmk". */
function invoiceBadgeNumber(inv: { invoiceNumber?: string | null; id: string }): string {
  const n = inv.invoiceNumber?.trim()
  if (!n) return String(inv.id)
  const digits = n.match(/\d+/)?.[0]
  return digits ?? n
}

export function InvoicesPageClient({
  initialInvoices,
  initialClients,
  initialSettings,
  initialNextInvoiceNumber,
  totalPages = 1,
  totalDocs: totalDocsProp = 0,
  currentPage = 1,
  initialSortBy = 'newest',
  initialEditId,
  initialNewInvoice,
}: {
  initialInvoices: InvoiceDoc[]
  initialClients: ClientDoc[]
  initialSettings: SettingsDoc | null
  initialNextInvoiceNumber: number
  totalPages?: number
  totalDocs?: number
  currentPage?: number
  initialSortBy?: 'newest' | 'oldest' | 'total-desc' | 'total-asc'
  initialEditId?: string
  initialNewInvoice?: boolean
}) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST)
  const [invoices, setInvoices] = useState<InvoiceDoc[]>(initialInvoices)
  const [clients, setClients] = useState<ClientDoc[]>(initialClients)
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(initialNextInvoiceNumber)
  const settings = initialSettings ?? defaultSettings

  // Keep next number in sync when server data changes (e.g. after refresh)
  useEffect(() => {
    setNextInvoiceNumber(initialNextInvoiceNumber)
  }, [initialNextInvoiceNumber])

  const [activeInvoice, setActiveInvoice] = useState<Partial<InvoiceDoc> & { clientId?: string }>({})
  const [items, setItems] = useState<LineItem[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [formError, setFormError] = useState<string | null>(null)

  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    brn: '',
    address: '',
  })
  const [addRecipientStatus, setAddRecipientStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const didOpenNewRef = useRef(false)

  const selectedClient = activeInvoice.clientId
    ? clients.find((c) => String(c.id) === String(activeInvoice.clientId))
    : null
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 50)
    const q = clientSearch.trim().toLowerCase()
    return clients.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    )
  }, [clients, clientSearch])

  // Filters (sort is server-side via URL; sync from initialSortBy)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'total-desc' | 'total-asc'>(initialSortBy)
  useEffect(() => {
    setSortBy(initialSortBy)
  }, [initialSortBy])

  // Persist new-invoice draft to localStorage (debounced)
  useEffect(() => {
    if (viewMode !== ViewMode.FORM || activeInvoice.id) return
    const t = setTimeout(() => {
      saveInvoiceDraft(activeInvoice, items)
    }, 500)
    return () => clearTimeout(t)
  }, [viewMode, activeInvoice, items])

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkStatusKey, setBulkStatusKey] = useState(0)
  const bulkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInvoices(initialInvoices)
  }, [initialInvoices])

  useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  useEffect(() => {
    if (!initialNewInvoice && !initialEditId) {
      setViewMode(ViewMode.LIST)
      didOpenNewRef.current = false
      return
    }
    if (initialNewInvoice && !didOpenNewRef.current) {
      didOpenNewRef.current = true
      handleCreateNew()
      return
    }
    if (!initialEditId || invoices.length === 0) return
    const inv = invoices.find((i) => String(i.id) === String(initialEditId))
    if (!inv) return
    const clientId = typeof inv.client === 'object' && inv.client !== null && 'id' in inv.client
      ? String((inv.client as { id: string }).id)
      : String(inv.client)
    setActiveInvoice({ ...inv, clientId })
    const rawItems = (inv as { items?: { description?: string; quantity?: number; rate?: number }[] }).items ?? []
    setItems(
      rawItems.length > 0
        ? rawItems.map((it, i) => ({
            id: `li-${i}-${Date.now()}`,
            description: it.description ?? '',
            quantity: Number(it.quantity) ?? 0,
            rate: Number(it.rate) ?? 0,
          }))
        : [{ id: `new-${Date.now()}`, description: '', quantity: 1, rate: 0 }]
    )
    setClientPickerOpen(false)
    setFormError(null)
    setViewMode(ViewMode.FORM)
  }, [initialEditId, initialNewInvoice, invoices])

  const handleCreateRecipient = async () => {
    if (!newRecipient.name?.trim() || !newRecipient.email?.trim()) return
    setAddRecipientStatus('loading')
    const result = await createClient({
      name: newRecipient.name,
      company: newRecipient.company || undefined,
      email: newRecipient.email,
      phone: newRecipient.phone || undefined,
      brn: newRecipient.brn || undefined,
      address: newRecipient.address || undefined,
    })
    if (result.doc) {
      const created = {
        id: String(result.doc.id),
        name: newRecipient.name,
        company: newRecipient.company ?? null,
        email: newRecipient.email,
      }
      setClients((prev) => [...prev, created])
      setActiveInvoice((prev) => ({ ...prev, clientId: String(result.doc!.id) }))
      setShowAddRecipient(false)
      setNewRecipient({ name: '', company: '', email: '', phone: '', brn: '', address: '' })
    }
    setAddRecipientStatus('idle')
  }

  const handleCreateNew = () => {
    setFormError(null)
    const draft = loadInvoiceDraft()
    if (draft) {
      setActiveInvoice(draft.activeInvoice)
      setItems(draft.items)
      setClientSearch('')
      setClientPickerOpen(false)
      setViewMode(ViewMode.FORM)
      return
    }
    const nextInvNum = `${settings.invoicePrefix}${nextInvoiceNumber}`
    setNextInvoiceNumber((n) => n + 1)
    setActiveInvoice({
      invoiceNumber: nextInvNum,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      taxRate: 15,
      discount: 0,
      shipping: 0,
      carNumber: '',
      notes: '',
    })
    setItems([
      {
        id: `new-${Date.now()}`,
        description: '',
        quantity: 1,
        rate: 0,
      },
    ])
    setClientSearch('')
    setClientPickerOpen(false)
    setViewMode(ViewMode.FORM)
  }

  const handlePreview = (inv: InvoiceDoc) => {
    const clientId = typeof inv.client === 'object' && inv.client !== null && 'id' in inv.client
      ? String((inv.client as { id: string }).id)
      : String(inv.client)
    setActiveInvoice({ ...inv, clientId })
    const rawItems = (inv as { items?: { description?: string; quantity?: number; rate?: number }[] }).items ?? []
    setItems(
      rawItems.map((it, i) => ({
        id: `li-${i}-${Date.now()}`,
        description: it.description ?? '',
        quantity: Number(it.quantity) ?? 0,
        rate: Number(it.rate) ?? 0,
      }))
    )
    setViewMode(ViewMode.PREVIEW)
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, curr) => acc + curr.quantity * curr.rate, 0)
    const discount = activeInvoice.discount ?? 0
    const afterDiscount = subtotal - discount
    const tax = (afterDiscount * (activeInvoice.taxRate ?? 15)) / 100
    const total = afterDiscount + tax + (activeInvoice.shipping ?? 0)
    return { subtotal, tax, total }
  }, [items, activeInvoice.taxRate, activeInvoice.discount, activeInvoice.shipping])

  const saveInvoice = async () => {
    const clientId = activeInvoice.clientId
    if (!clientId || items.length === 0) {
      setFormError('Please select a recipient and add at least one line item.')
      return
    }
    setFormError(null)
    setSaveStatus('loading')
    const subtotal = items.reduce((acc, curr) => acc + curr.quantity * curr.rate, 0)
    const tax = (subtotal * (activeInvoice.taxRate ?? 15)) / 100
    const total = subtotal + tax
    const payload = {
      client: Number(clientId),
      invoiceNumber: activeInvoice.invoiceNumber ?? `INV-${Date.now()}`,
      date: activeInvoice.date ?? new Date().toISOString().split('T')[0],
      dueDate: activeInvoice.dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items.map(({ id: _id, ...rest }) => rest),
      status: activeInvoice.status ?? 'draft',
      taxRate: 15,
      discount: activeInvoice.discount ?? 0,
      shipping: activeInvoice.shipping ?? 0,
      carNumber: activeInvoice.carNumber ?? '',
      notes: activeInvoice.notes ?? '',
      subtotal,
      tax,
      total,
    }
    const id = activeInvoice.id ? Number(activeInvoice.id) : null
    const result = id
      ? await updateInvoice(id, payload)
      : await createInvoice(payload)
    if (result.doc?.id != null) {
      setFormError(null)
      clearInvoiceDraft()
      router.push(`/dashboard/invoices/${result.doc.id}`)
      return
    }
    if (result.errors?.length) {
      setSaveStatus('error')
      setFormError(result.errors[0]?.message ?? 'Failed to save invoice.')
    } else {
      setFormError(null)
      clearInvoiceDraft()
      router.refresh()
      setViewMode(ViewMode.LIST)
    }
    setSaveStatus('idle')
  }

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return
    setDeleteLoading(true)
    const result = await deleteInvoice(Number(deleteInvoiceId))
    if (result.ok) {
      setInvoices((prev) => prev.filter((i) => String(i.id) !== deleteInvoiceId))
      setDeleteInvoiceId(null)
      router.refresh()
    }
    setDeleteLoading(false)
  }

  const handleMagicFill = async () => {
    if (!aiPrompt.trim()) return
    setIsAiLoading(true)
    const data = await parseInvoicePrompt(aiPrompt)
    if ('error' in data) {
      setIsAiLoading(false)
      return
    }
    if (data.items?.length) {
      setItems(
        data.items.map((it) => ({
          id: `li-${Math.random().toString(36).slice(2, 9)}`,
          description: it.description ?? '',
          quantity: Number(it.quantity) ?? 0,
          rate: Number(it.rate) ?? 0,
        }))
      )
    }
    if (data.clientName && clients.length) {
      const search = (data.clientName ?? '').toLowerCase()
      const found = clients.find(
        (c) =>
          (c.name ?? '').toLowerCase().includes(search) ||
          (c.company ?? '').toLowerCase().includes(search)
      )
      if (found) setActiveInvoice((prev) => ({ ...prev, clientId: String(found.id) }))
    }
    if (data.notes) setActiveInvoice((prev) => ({ ...prev, notes: data.notes }))
    setIsAiLoading(false)
    setAiPrompt('')
  }

  const getClientForInvoice = (inv: InvoiceDoc) => {
    const c = inv.client
    if (typeof c === 'object' && c !== null && 'name' in c) return c as { id: string; name?: string | null; company?: string | null }
    const id = typeof c === 'object' ? (c as { id?: string })?.id : c
    return clients.find((x) => String(x.id) === String(id)) ?? null
  }

  const filteredInvoices = useMemo(() => {
    let list = invoices
    if (filterStatus) {
      list = list.filter((inv) => (inv.status ?? 'draft') === filterStatus)
    }
    if (filterClientId) {
      list = list.filter((inv) => {
        const c = inv.client
        const id = typeof c === 'object' && c !== null && 'id' in c ? String((c as { id: string }).id) : String(c)
        return id === filterClientId
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((inv) => {
        const client = getClientForInvoice(inv)
        const invNum = (inv.invoiceNumber ?? '').toLowerCase()
        const clientName = (client?.name ?? '').toLowerCase()
        const company = (client?.company ?? '').toLowerCase()
        return invNum.includes(q) || clientName.includes(q) || company.includes(q)
      })
    }
    return list
  }, [invoices, clients, filterStatus, filterClientId, searchQuery])

  const previewClient = activeInvoice.clientId
    ? clients.find((c) => String(c.id) === String(activeInvoice.clientId))
    : null

  const renderPreview = () => (
    <div className="fixed inset-0 z-[150] flex min-h-0 flex-col animate-in fade-in zoom-in duration-300 bg-background">
      <div className="app-header-sticky flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={() => setViewMode(ViewMode.LIST)}
          className="flex items-center font-medium text-primary"
        >
          <ChevronLeft className="mr-2 size-4" /> Done
        </button>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 no-scrollbar pb-20">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 md:p-12 text-slate-900 shadow-2xl print:shadow-none print:p-0">
          <div className="flex justify-between items-start mb-10">
            <div>
              <img src={settings.logoUrl ?? ''} className="h-12 mb-4" alt="Company logo" />
              <h2 className="text-xl font-black">{settings.businessName}</h2>
              <div className="text-slate-500 text-[10px] mt-1 font-medium leading-relaxed">
                <p>{settings.businessAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter mb-2">Invoice</h1>
              <p className="font-bold text-slate-900">{displayInvoiceNumber(activeInvoice.invoiceNumber ?? null, activeInvoice.id ?? '')}</p>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">
                {activeInvoice.date}
              </p>
            </div>
          </div>

          <div className="mb-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
            <h3 className="text-lg font-black">{previewClient?.name ?? '—'}</h3>
            <p className="text-slate-500 text-xs">{previewClient?.company ?? '—'}</p>
          </div>

          <table className="w-full mb-10">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="py-3 text-left text-[9px] font-black uppercase text-slate-400">Item</th>
                <th className="py-3 text-right text-[9px] font-black uppercase text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4">
                    <p className="text-sm font-bold">{item.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.quantity} × {formatCurrency(item.rate, settings.currency)}
                    </p>
                  </td>
                  <td className="py-4 text-right font-black text-sm">
                    {formatCurrency(item.quantity * item.rate, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 border-t pt-6">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-xs font-semibold text-foreground">
              <span className="uppercase tracking-widest">Total Amount</span>
              <span className="font-mono text-lg tabular-nums sm:text-2xl">{formatCurrency(totals.total, settings.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500 pb-20 lg:pb-0">
      {viewMode === ViewMode.LIST && (
        <>
          <header className="flex justify-between items-end px-2 lg:px-0">
            <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">Billing</h2>
            <p className="text-sm font-medium text-muted-foreground">Invoices and payments.</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/export/invoices"
                download
                className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground lg:size-auto lg:gap-2 lg:px-4 lg:py-3 lg:text-xs"
              >
                <Download className="size-4 lg:mr-1" />
                <span className="hidden lg:inline">Export CSV</span>
              </a>
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-medium transition-opacity hover:opacity-90 lg:size-auto lg:gap-2 lg:px-6 lg:py-3"
              >
                <Plus className="size-5 lg:mr-2" />
                <span className="hidden lg:inline uppercase text-xs tracking-widest">New Invoice</span>
              </button>
            </div>
          </header>

          {/* Filters */}
          <div className="px-2 lg:px-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Filter className="size-3.5" />
                <span>Filter</span>
              </div>
              <input
                type="text"
                placeholder="Search by invoice # or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full min-w-[140px] max-w-[220px] rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All statuses</option>
                {(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="h-9 min-w-[160px] max-w-[240px] rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.company ?? '—'}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => {
                  const value = e.target.value as typeof sortBy
                  setSortBy(value)
                  const params = new URLSearchParams()
                  if (value !== 'newest') params.set('sort', value)
                  params.set('page', '1')
                  if (initialEditId) params.set('edit', initialEditId)
                  if (initialNewInvoice) params.set('new', '1')
                  const q = params.toString()
                  router.push(q ? `/dashboard/invoices?${q}` : '/dashboard/invoices')
                }}
                className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="total-desc">Total: high → low</option>
                <option value="total-asc">Total: low → high</option>
              </select>
              {(filterStatus || filterClientId || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('')
                    setFilterClientId('')
                    setSearchQuery('')
                  }}
                  className="h-9 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
            {(filterStatus || filterClientId || searchQuery.trim()) && (
              <p className="text-[10px] text-muted-foreground">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
            )}
            {!(filterStatus || filterClientId || searchQuery.trim()) && totalDocsProp > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Showing {(currentPage - 1) * LIST_PAGE_SIZE + 1}–{Math.min(currentPage * LIST_PAGE_SIZE, totalDocsProp)} of {totalDocsProp} invoices
              </p>
            )}
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="px-2 lg:px-0 mb-3">
              <Card className="rounded-2xl border border-border bg-card py-0 shadow-sm">
                <CardContent className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="text-sm font-medium text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Select
                    key={bulkStatusKey}
                    disabled={bulkLoading}
                    onValueChange={async (status) => {
                      if (!status || bulkLoading) return
                      const ids = Array.from(selectedIds).map(Number)
                      console.log('[BulkStatus] client: start', { ids, status })
                      setBulkLoading(true)
                      if (bulkTimeoutRef.current) clearTimeout(bulkTimeoutRef.current)
                      bulkTimeoutRef.current = setTimeout(() => {
                        console.log('[BulkStatus] client: timeout')
                        setBulkLoading(false)
                        bulkTimeoutRef.current = null
                        alert('Update is taking too long. Please refresh the page.')
                      }, 15000)
                      try {
                        const result = await bulkUpdateInvoiceStatus(ids, status)
                        console.log('[BulkStatus] client: result', result)
                        if (result.updated != null) {
                          setSelectedIds(new Set())
                          setBulkStatusKey((k) => k + 1)
                          router.refresh()
                        } else if (result.error) {
                          console.error('[BulkStatus] client: error from server', result.error)
                          alert(result.error)
                        }
                      } catch (e) {
                        console.error('[BulkStatus] client: catch', e)
                        alert(e instanceof Error ? e.message : 'Update failed')
                      } finally {
                        if (bulkTimeoutRef.current) {
                          clearTimeout(bulkTimeoutRef.current)
                          bulkTimeoutRef.current = null
                        }
                        setBulkLoading(false)
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px] rounded-lg border border-input bg-background text-xs font-medium">
                      <SelectValue placeholder="Change status to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
                        <SelectItem key={s} value={s} className="text-sm">
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={bulkLoading}
                    className="h-9 text-xs font-medium"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear selection
                  </Button>
                  {bulkLoading && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Updating…
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-3 px-2 lg:px-0">
            {filteredInvoices.length > 0 ? (
              <>
                {/* Select all on page — only when at least one is selected */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 lg:px-6 lg:py-3">
                    <Checkbox
                      id="select-all-invoices"
                      className="shrink-0"
                      checked={
                        filteredInvoices.length > 0 &&
                        filteredInvoices.every((inv) => selectedIds.has(String(inv.id)))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            filteredInvoices.forEach((inv) => next.add(String(inv.id)))
                            return next
                          })
                        } else {
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            filteredInvoices.forEach((inv) => next.delete(String(inv.id)))
                            return next
                          })
                        }
                      }}
                    />
                    <label
                      htmlFor="select-all-invoices"
                      className="text-sm font-medium text-muted-foreground cursor-pointer select-none"
                    >
                      Select all on page
                    </label>
                  </div>
                )}
              {filteredInvoices.map((inv) => {
                const client = getClientForInvoice(inv)
                const status = (inv.status ?? 'draft') as string
                return (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-accent/50 active:bg-accent/70 lg:p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        className="shrink-0"
                      >
                        <Checkbox
                          className="size-4"
                          checked={selectedIds.has(String(inv.id))}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (checked) next.add(String(inv.id))
                              else next.delete(String(inv.id))
                              return next
                            })
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted font-medium text-foreground">
                        {invoiceBadgeNumber(inv)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {client?.name ?? 'Unknown Client'}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {displayInvoiceNumber(inv.invoiceNumber, String(inv.id))} •{' '}
                          {typeof inv.date === 'string' ? inv.date.slice(0, 10) : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0 ml-4">
                      <p className="text-base font-semibold text-foreground lg:text-lg">
                        {formatCurrency(Number(inv.total), settings.currency)}
                      </p>
                      <span
                        className={`mt-1 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${
                          STATUS_STYLE[status] ?? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                        }`}
                      >
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <div
                        className="mt-2 flex items-center gap-2"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/dashboard/invoices?edit=${inv.id}`)
                          }}
                          className="text-[10px] font-medium uppercase tracking-wider text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeleteInvoiceId(String(inv.id))
                          }}
                          className="text-[10px] font-medium uppercase tracking-wider text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
              </>
            ) : invoices.length > 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
                <div className="flex size-20 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
                  <Search className="size-10" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  No invoices match your filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('')
                    setFilterClientId('')
                    setSearchQuery('')
                  }}
                  className="text-xs font-medium uppercase tracking-wider text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
                <div className="flex size-20 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
                  <Receipt className="size-10" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  No billing flow detected.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="text-xs font-medium uppercase tracking-wider text-primary hover:underline"
                >
                  Initiate First Invoice
                </button>
              </div>
            )}
          </div>
          {viewMode === ViewMode.LIST && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/dashboard/invoices"
              preserveParams={{
                ...(sortBy !== 'newest' && { sort: sortBy }),
                ...(initialEditId && { edit: initialEditId }),
                ...(initialNewInvoice && { new: '1' }),
              }}
            />
          )}
        </>
      )}

      {viewMode === ViewMode.FORM && (
        <div className="fixed inset-0 z-[200] flex min-h-0 flex-col animate-in slide-in-from-bottom-12 duration-500 bg-background lg:relative lg:inset-auto lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-card">
          <div className="app-header-sticky flex min-h-[5.5rem] shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setViewMode(ViewMode.LIST)
              }}
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Cancel
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                Draft
              </h3>
              <p className="mt-1 text-[9px] font-medium uppercase text-muted-foreground">
                {displayInvoiceNumber(activeInvoice.invoiceNumber ?? null, activeInvoice.id ?? '')}
              </p>
            </div>
            <button
              type="button"
              onClick={saveInvoice}
              disabled={saveStatus === 'loading'}
              className="text-[11px] font-medium uppercase tracking-wider text-primary disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4 p-5 md:p-10 space-y-8 no-scrollbar pb-72 md:pb-64">
            {formError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="size-4" />
                <AlertTitle>Please fix the following</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {!activeInvoice.id && (
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">AI draft</span>
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="e.g. 10 hours dev at $100 for ACME Corp"
                    className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleMagicFill}
                    disabled={isAiLoading}
                    className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {isAiLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Zap className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-5 md:space-y-6">
              <section className="space-y-3">
                <label className="block px-1 text-xs font-medium text-foreground sm:text-[10px] sm:uppercase sm:tracking-wider sm:text-muted-foreground">
                  Recipient (Bill to)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={selectedClient ? 'Search to change client...' : 'Search clients by name, company or email...'}
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setClientPickerOpen(true)
                    }}
                    onFocus={() => setClientPickerOpen(true)}
                    className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                  />
                  {selectedClient && (
                    <div className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {selectedClient.name ?? selectedClient.company ?? selectedClient.email ?? '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInvoice((prev) => ({ ...prev, clientId: undefined }))
                          setClientSearch('')
                        }}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation"
                        aria-label="Clear selection"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                  {clientPickerOpen && (!selectedClient || clientSearch) && (
                    <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
                      {filteredClients.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No clients match. Add one below.
                        </p>
                      ) : (
                        <ul className="py-1">
                          {filteredClients.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveInvoice((prev) => ({ ...prev, clientId: c.id }))
                                  setClientSearch('')
                                  setClientPickerOpen(false)
                                }}
                                className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground hover:bg-muted/70 active:bg-muted touch-manipulation"
                              >
                                <span className="truncate font-medium">{c.name ?? '—'}</span>
                                {c.company && (
                                  <span className="truncate text-muted-foreground">· {c.company}</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                {!showAddRecipient ? (
                  <button
                    type="button"
                    onClick={() => setShowAddRecipient(true)}
                    className="flex min-h-[44px] items-center gap-2 text-xs font-medium text-primary hover:underline touch-manipulation"
                  >
                    <Plus className="size-4" />
                    New recipient
                  </button>
                ) : (
                  <div className="mt-3 space-y-4 rounded-xl border border-border bg-muted/50 p-4 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-medium text-muted-foreground">
                      Create new connection
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        placeholder="Full name"
                        className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        placeholder="Company"
                        className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                        value={newRecipient.company}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, company: e.target.value }))}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2 touch-manipulation"
                        value={newRecipient.email}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, email: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="BRN (Business Registration No.) — optional"
                        className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2 touch-manipulation"
                        value={newRecipient.brn}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, brn: e.target.value }))}
                      />
                    </div>
                    {addRecipientStatus === 'error' && (
                      <p className="text-sm text-destructive">Failed to save. Try again.</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRecipient(false)
                          setNewRecipient({ name: '', company: '', email: '', phone: '', brn: '', address: '' })
                          setAddRecipientStatus('idle')
                        }}
                        className="min-h-[44px] flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground touch-manipulation"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateRecipient}
                        disabled={addRecipientStatus === 'loading' || !newRecipient.name?.trim() || !newRecipient.email?.trim()}
                        className="min-h-[44px] flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 touch-manipulation"
                      >
                        {addRecipientStatus === 'loading' ? 'Saving...' : 'Add & select'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-medium text-foreground sm:text-[10px] sm:uppercase sm:tracking-wider sm:text-muted-foreground">
                    Line items
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => [
                        ...p,
                        {
                          id: Math.random().toString(36).slice(2, 9),
                          description: '',
                          quantity: 1,
                          rate: 0,
                        },
                      ])
                    }
                    className="min-h-[44px] rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-medium text-primary touch-manipulation"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border-2 border-border bg-card p-4 animate-in slide-in-from-right-4 duration-300"
                    >
                      <div className="mb-4 flex items-start gap-2">
                        <label className="sr-only">Service or item description</label>
                        <input
                          placeholder="e.g. Consulting, Design, Parts, Labour..."
                          className="min-h-[48px] flex-1 rounded-xl border-2 border-input bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 touch-manipulation"
                          value={item.description}
                          onChange={(e) => {
                            const n = [...items]
                            n[idx] = { ...n[idx], description: e.target.value }
                            setItems(n)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (items.length <= 1) {
                              setItems([
                                {
                                  id: `new-${Date.now()}`,
                                  description: '',
                                  quantity: 1,
                                  rate: 0,
                                },
                              ])
                            } else {
                              setItems((p) => p.filter((i) => i.id !== item.id))
                            }
                          }}
                          className="mt-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive touch-manipulation"
                          aria-label="Remove row"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Qty</p>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => {
                              const n = [...items]
                              n[idx] = { ...n[idx], quantity: parseFloat(e.target.value) || 0 }
                              setItems(n)
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Rate</p>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => {
                              const n = [...items]
                              n[idx] = { ...n[idx], rate: parseFloat(e.target.value) || 0 }
                              setItems(n)
                            }}
                          />
                        </div>
                        <div className="flex flex-col justify-end space-y-1 text-right">
                          <p className="text-xs font-medium text-muted-foreground">Amount</p>
                          <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(item.quantity * item.rate, settings.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                    value={activeInvoice.date ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Due date</label>
                  <input
                    type="date"
                    className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                    value={activeInvoice.dueDate ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground">Car / vehicle ref</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                    value={activeInvoice.carNumber ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, carNumber: e.target.value }))
                    }
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    className="min-h-[44px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                    value={activeInvoice.status ?? 'draft'}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    {['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'].map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Tax rate (%)</label>
                  <div className="flex min-h-[44px] items-center rounded-xl border border-border bg-muted/50 px-4 py-3 text-base font-medium text-foreground">
                    15%
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Terms & notes</label>
                <textarea
                  className="min-h-[88px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
                  placeholder="Payment instructions, bank details, etc."
                  value={activeInvoice.notes ?? ''}
                  onChange={(e) =>
                    setActiveInvoice((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </section>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex min-h-0 flex-row items-center justify-between gap-4 border-t border-border bg-card/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm lg:relative lg:rounded-b-3xl">
            <div className="flex flex-col justify-center">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                {formatCurrency(totals.total, settings.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={saveInvoice}
              disabled={saveStatus === 'loading'}
              className="shrink-0 rounded-xl bg-primary px-10 py-4 text-[10px] font-medium uppercase tracking-wider text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {saveStatus === 'loading' ? 'Saving...' : 'Sync Records'}
            </button>
          </div>
        </div>
      )}

      {viewMode === ViewMode.PREVIEW && renderPreview()}

      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The invoice will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteInvoice}
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
