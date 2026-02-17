'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@/payload-types'

type LineItem = { description: string; quantity: number; rate: number }

export function InvoiceForm({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [clientId, setClientId] = useState<string>('')
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, rate: 0 }])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then((r) => r.json())
      .then((data) => setClients(data.docs ?? []))
      .catch(() => setClients([]))
  }, [])

  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.rate, 0)
  const tax = (subtotal * taxRate) / 100
  const total = subtotal + tax

  const addRow = () => setItems((p) => [...p, { description: '', quantity: 1, rate: 0 }])
  const updateRow = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((p) => {
      const n = [...p]
      n[idx] = { ...n[idx], [field]: value }
      return n
    })
  }
  const removeRow = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx))

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
            description: it.description ?? '',
            quantity: Number(it.quantity) ?? 0,
            rate: Number(it.rate) ?? 0,
          }))
        )
      }
      if (data.clientName && clients.length) {
        const found = clients.find(
          (c) =>
            c.name?.toLowerCase().includes(data.clientName.toLowerCase()) ||
            (c as { company?: string }).company?.toLowerCase().includes(data.clientName.toLowerCase())
        )
        if (found) setClientId(String(found.id))
      }
      if (data.notes) setNotes(data.notes)
    } catch {
      // ignore
    } finally {
      setIsAiLoading(false)
      setAiPrompt('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || items.length === 0 || items.every((i) => !i.description)) return
    setStatus('loading')
    try {
      const payload = {
        client: Number(clientId),
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items,
        status: 'draft',
        taxRate,
        discount: 0,
        shipping: 0,
        notes,
        subtotal,
        tax,
        total,
      }
      const url = invoiceId ? `/api/invoices/${invoiceId}` : '/api/invoices'
      const method = invoiceId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard/invoices')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6">
      {!invoiceId && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Sparkles className="size-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider">AI draft</span>
          </div>
          <div className="flex gap-2">
            <input
              placeholder='e.g. "10 hours dev at $100 for ACME Corp"'
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
      <div>
        <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Client
        </label>
        <select
          className="w-full rounded-xl border border-input bg-background px-5 py-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex justify-between items-center px-2 mb-2">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Line items</label>
          <button type="button" onClick={addRow} className="text-[9px] font-medium uppercase tracking-wider text-primary">
            Add row
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
              <input
                placeholder="Description"
                className="min-w-[120px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={item.description}
                onChange={(e) => updateRow(idx, 'description', e.target.value)}
              />
              <input
                type="number"
                min={0}
                step={1}
                className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={item.quantity}
                onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value) || 0)}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={item.rate}
                onChange={(e) => updateRow(idx, 'rate', Number(e.target.value) || 0)}
              />
              <span className="w-16 text-xs font-medium text-foreground">
                {formatCurrency(item.quantity * item.rate)}
              </span>
              <button type="button" onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tax rate (%)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Notes
        </label>
        <textarea
          className="min-h-[80px] w-full rounded-xl border border-input bg-background px-5 py-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {status === 'error' && <p className="text-sm text-destructive">Failed to save. Try again.</p>}
      <div className="flex items-center justify-between pt-4">
        <p className="font-mono text-lg font-semibold tabular-nums text-foreground sm:text-2xl">Total: {formatCurrency(total)}</p>
        <div className="flex gap-3">
          <Link href="/dashboard/invoices" className="rounded-xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {status === 'loading' ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </form>
  )
}
