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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
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

// Legacy Invoices layout – same as _legacy/pages/Invoices.tsx: LIST / FORM / PREVIEW on one page

type LineItem = { id: string; description: string; quantity: number; rate: number }

type ClientDoc = { id: string; name: string | null; company?: string | null }
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
  overdue: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  draft: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  sent: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  cancelled: 'text-slate-500 border-slate-500/20 bg-slate-500/5',
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
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

export function InvoicesPageClient({
  initialInvoices,
  initialClients,
  initialSettings,
  initialEditId,
  initialNewInvoice,
}: {
  initialInvoices: InvoiceDoc[]
  initialClients: ClientDoc[]
  initialSettings: SettingsDoc | null
  initialEditId?: string
  initialNewInvoice?: boolean
}) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST)
  const [invoices, setInvoices] = useState<InvoiceDoc[]>(initialInvoices)
  const [clients, setClients] = useState<ClientDoc[]>(initialClients)
  const settings = initialSettings ?? defaultSettings

  const [activeInvoice, setActiveInvoice] = useState<Partial<InvoiceDoc> & { clientId?: string }>({})
  const [items, setItems] = useState<LineItem[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
  })
  const [addRecipientStatus, setAddRecipientStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const didOpenNewRef = useRef(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'total-desc' | 'total-asc'>('newest')

  useEffect(() => {
    setInvoices(initialInvoices)
  }, [initialInvoices])

  useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  useEffect(() => {
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
      rawItems.map((it, i) => ({
        id: `li-${i}-${Date.now()}`,
        description: it.description ?? '',
        quantity: Number(it.quantity) ?? 0,
        rate: Number(it.rate) ?? 0,
      }))
    )
    setViewMode(ViewMode.FORM)
  }, [initialEditId, initialNewInvoice, invoices])

  const handleCreateRecipient = async () => {
    if (!newRecipient.name?.trim() || !newRecipient.email?.trim()) return
    setAddRecipientStatus('loading')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipient),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      const doc = data.doc ?? data
      const created = { id: doc.id, name: doc.name ?? newRecipient.name, company: doc.company ?? newRecipient.company ?? null, email: doc.email ?? newRecipient.email }
      setClients((prev) => [...prev, created])
      setActiveInvoice((prev) => ({ ...prev, clientId: String(doc.id) }))
      setShowAddRecipient(false)
      setNewRecipient({ name: '', company: '', email: '', phone: '', address: '' })
      setAddRecipientStatus('idle')
    } catch {
      setAddRecipientStatus('error')
    }
  }

  const handleCreateNew = () => {
    const nextInvNum = `${settings.invoicePrefix}${invoices.length + 1001}`
    setActiveInvoice({
      invoiceNumber: nextInvNum,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      taxRate: settings.taxRateDefault,
      discount: 0,
      shipping: 0,
      carNumber: '',
      notes: '',
    })
    setItems([])
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
    const tax = (afterDiscount * (activeInvoice.taxRate ?? 0)) / 100
    const total = afterDiscount + tax + (activeInvoice.shipping ?? 0)
    return { subtotal, tax, total }
  }, [items, activeInvoice.taxRate, activeInvoice.discount, activeInvoice.shipping])

  const saveInvoice = async () => {
    const clientId = activeInvoice.clientId
    if (!clientId || items.length === 0) {
      alert('Please select a recipient and add items.')
      return
    }
    setSaveStatus('loading')
    const subtotal = items.reduce((acc, curr) => acc + curr.quantity * curr.rate, 0)
    const tax = (subtotal * (activeInvoice.taxRate ?? 0)) / 100
    const total = subtotal + tax
    const payload = {
      client: Number(clientId),
      invoiceNumber: activeInvoice.invoiceNumber ?? `INV-${Date.now()}`,
      date: activeInvoice.date ?? new Date().toISOString().split('T')[0],
      dueDate: activeInvoice.dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items.map(({ id: _id, ...rest }) => rest),
      status: activeInvoice.status ?? 'draft',
      taxRate: activeInvoice.taxRate ?? 0,
      discount: activeInvoice.discount ?? 0,
      shipping: activeInvoice.shipping ?? 0,
      carNumber: activeInvoice.carNumber ?? '',
      notes: activeInvoice.notes ?? '',
      subtotal,
      tax,
      total,
    }
    try {
      // Payload REST uses numeric id for PATCH
      const id = activeInvoice.id
      const url = id ? `/api/invoices/${Number(id) || id}` : '/api/invoices'
      const method = id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const savedId = data.doc?.id ?? data.id
      if (savedId != null) {
        router.push(`/dashboard/invoices/${savedId}`)
        return
      }
      const updatedList = await fetch('/api/invoices?limit=100').then((r) => r.json())
      setInvoices(updatedList.docs ?? [])
      setViewMode(ViewMode.LIST)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaveStatus('idle')
    }
  }

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/invoices/${deleteInvoiceId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setInvoices((prev) => prev.filter((i) => String(i.id) !== deleteInvoiceId))
      setDeleteInvoiceId(null)
      router.refresh()
    } catch {
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleMagicFill = async () => {
    if (!aiPrompt.trim()) return
    setIsAiLoading(true)
    try {
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.items?.length) {
        setItems(
          data.items.map((it: { description?: string; quantity?: number; rate?: number }) => ({
            id: `li-${Math.random().toString(36).slice(2, 9)}`,
            description: it.description ?? '',
            quantity: Number(it.quantity) ?? 0,
            rate: Number(it.rate) ?? 0,
          }))
        )
      }
      if (data.clientName && clients.length) {
        const found = clients.find(
          (c) =>
            (c.name ?? '').toLowerCase().includes(data.clientName?.toLowerCase()) ||
            (c.company ?? '').toLowerCase().includes(data.clientName?.toLowerCase())
        )
        if (found) setActiveInvoice((prev) => ({ ...prev, clientId: String(found.id) }))
      }
      if (data.notes) setActiveInvoice((prev) => ({ ...prev, notes: data.notes }))
    } catch {
      // ignore
    } finally {
      setIsAiLoading(false)
      setAiPrompt('')
    }
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
    const sorted = [...list]
    if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const da = typeof a.date === 'string' ? new Date(a.date).getTime() : 0
        const db = typeof b.date === 'string' ? new Date(b.date).getTime() : 0
        return db - da
      })
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => {
        const da = typeof a.date === 'string' ? new Date(a.date).getTime() : 0
        const db = typeof b.date === 'string' ? new Date(b.date).getTime() : 0
        return da - db
      })
    } else if (sortBy === 'total-desc') {
      sorted.sort((a, b) => Number(b.total) - Number(a.total))
    } else if (sortBy === 'total-asc') {
      sorted.sort((a, b) => Number(a.total) - Number(b.total))
    }
    return sorted
  }, [invoices, clients, filterStatus, filterClientId, searchQuery, sortBy])

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
              <img src={settings.logoUrl ?? ''} className="h-12 mb-4" alt="Logo" />
              <h2 className="text-xl font-black">{settings.businessName}</h2>
              <div className="text-slate-500 text-[10px] mt-1 font-medium leading-relaxed">
                <p>{settings.businessAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter mb-2">Invoice</h1>
              <p className="font-bold text-slate-900">{activeInvoice.invoiceNumber}</p>
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
                {(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
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
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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
          </div>

          <div className="space-y-3 px-2 lg:px-0">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => {
                const client = getClientForInvoice(inv)
                const status = (inv.status ?? 'draft') as string
                return (
                  <div
                    key={inv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/invoices/${inv.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-accent/50 lg:p-6"
                  >
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted font-medium text-foreground">
                        {inv.invoiceNumber?.split('-')[1] ?? '#'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {client?.name ?? 'Unknown Client'}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {inv.invoiceNumber} •{' '}
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
                      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/invoices?edit=${inv.id}`}
                          className="text-[10px] font-medium uppercase tracking-wider text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setDeleteInvoiceId(String(inv.id))
                          }}
                          className="text-[10px] font-medium uppercase tracking-wider text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
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
        </>
      )}

      {viewMode === ViewMode.FORM && (
        <div className="fixed inset-0 z-[200] flex min-h-0 flex-col animate-in slide-in-from-bottom-12 duration-500 bg-background lg:relative lg:inset-auto lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-card">
          <div className="app-header-sticky flex min-h-[5.5rem] shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setViewMode(ViewMode.LIST)}
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Cancel
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                Draft
              </h3>
              <p className="mt-1 text-[9px] font-medium uppercase text-muted-foreground">
                {activeInvoice.invoiceNumber}
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

            <div className="space-y-4">
              <section className="space-y-2">
                <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recipient Entity
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-input bg-background px-5 py-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={activeInvoice.clientId ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, clientId: e.target.value }))
                    }
                  >
                    <option value="">
                      Select client...
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name ?? '—'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 size-4 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
                {!showAddRecipient ? (
                  <button
                    type="button"
                    onClick={() => setShowAddRecipient(true)}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary hover:underline"
                  >
                    <Plus className="size-3" />
                    New recipient
                  </button>
                ) : (
                  <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/50 p-4 animate-in slide-in-from-top-2 duration-200">
                    <p className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Create new connection
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        placeholder="Full name"
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        placeholder="Company"
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={newRecipient.company}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, company: e.target.value }))}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2"
                        value={newRecipient.email}
                        onChange={(e) => setNewRecipient((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    {addRecipientStatus === 'error' && (
                      <p className="text-[10px] text-destructive">Failed to save. Try again.</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRecipient(false)
                          setNewRecipient({ name: '', company: '', email: '', phone: '', address: '' })
                          setAddRecipientStatus('idle')
                        }}
                        className="flex-1 rounded-xl border border-border py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateRecipient}
                        disabled={addRecipientStatus === 'loading' || !newRecipient.name?.trim() || !newRecipient.email?.trim()}
                        className="flex-1 rounded-xl bg-primary py-2.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                      >
                        {addRecipientStatus === 'loading' ? 'Saving...' : 'Add & select'}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Ledger Items
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
                    className="text-[9px] font-medium uppercase tracking-wider text-primary"
                  >
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-4 animate-in slide-in-from-right-4 duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <input
                          placeholder="Service Description"
                          className="flex-1 border-none bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-0"
                          value={item.description}
                          onChange={(e) => {
                            const n = [...items]
                            n[idx] = { ...n[idx], description: e.target.value }
                            setItems(n)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <p className="mb-1 text-[8px] font-medium uppercase text-muted-foreground">Quantity</p>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                            value={item.quantity}
                            onChange={(e) => {
                              const n = [...items]
                              n[idx] = { ...n[idx], quantity: parseFloat(e.target.value) || 0 }
                              setItems(n)
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="mb-1 text-[8px] font-medium uppercase text-muted-foreground">Unit Rate</p>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                            value={item.rate}
                            onChange={(e) => {
                              const n = [...items]
                              n[idx] = { ...n[idx], rate: parseFloat(e.target.value) || 0 }
                              setItems(n)
                            }}
                          />
                        </div>
                        <div className="flex-1 text-right flex flex-col justify-end">
                          <p className="mb-1 text-[8px] font-medium uppercase text-muted-foreground">Amount</p>
                          <p className="text-xs font-medium text-foreground">
                            {formatCurrency(item.quantity * item.rate, settings.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-border py-10 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      No line items specified.
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-ring"
                    value={activeInvoice.date ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-ring"
                    value={activeInvoice.dueDate ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Car number
                  </label>
                  <input
                    type="text"
                    placeholder="Vehicle / car reference"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    value={activeInvoice.carNumber ?? ''}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, carNumber: e.target.value }))
                    }
                  />
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-ring"
                    value={activeInvoice.status ?? 'draft'}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs text-foreground focus:ring-2 focus:ring-ring"
                    value={activeInvoice.taxRate ?? 0}
                    onChange={(e) =>
                      setActiveInvoice((prev) => ({
                        ...prev,
                        taxRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="space-y-1">
                <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Terms & Notes
                </label>
                <textarea
                  className="h-24 w-full rounded-xl border border-input bg-background px-5 py-4 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  placeholder="Payment instructions, bank details, etc..."
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
