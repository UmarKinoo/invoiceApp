'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@/payload-types'

type LineItem = { description: string; quantity: number; rate: number }

type InitialQuote = {
  id: number
  clientId: number
  quoteNumber: string
  date: string
  status: string
  items: LineItem[]
  total: number
}

export function QuoteForm({ initialQuote }: { initialQuote?: InitialQuote | null }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [clientId, setClientId] = useState(initialQuote ? String(initialQuote.clientId) : '')
  const [items, setItems] = useState<LineItem[]>(
    initialQuote?.items?.length
      ? initialQuote.items.map((i) => ({
          description: i.description ?? '',
          quantity: i.quantity ?? 0,
          rate: i.rate ?? 0,
        }))
      : [{ description: '', quantity: 1, rate: 0 }]
  )

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then((r) => r.json())
      .then((data) => setClients(data.docs ?? []))
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    if (initialQuote) {
      setClientId(String(initialQuote.clientId))
      setItems(
        initialQuote.items?.length
          ? initialQuote.items.map((i) => ({
              description: i.description ?? '',
              quantity: i.quantity ?? 0,
              rate: i.rate ?? 0,
            }))
          : [{ description: '', quantity: 1, rate: 0 }]
      )
    }
  }, [initialQuote])

  const total = items.reduce((acc, i) => acc + i.quantity * i.rate, 0)
  const addRow = () => setItems((p) => [...p, { description: '', quantity: 1, rate: 0 }])
  const updateRow = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((p) => {
      const n = [...p]
      n[idx] = { ...n[idx], [field]: value }
      return n
    })
  }
  const removeRow = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || items.length === 0) return
    setStatus('loading')
    try {
      const payload = {
        client: Number(clientId),
        quoteNumber: initialQuote?.quoteNumber ?? `QT-${Date.now().toString().slice(-4)}`,
        date: initialQuote?.date ?? new Date().toISOString().split('T')[0],
        items,
        status: initialQuote?.status ?? 'pending',
        total,
      }
      const url = initialQuote ? `/api/quotes/${initialQuote.id}` : '/api/quotes'
      const method = initialQuote ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      if (initialQuote) {
        router.push(`/dashboard/quotes/${initialQuote.id}`)
      } else {
        router.push('/dashboard/quotes')
      }
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6">
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
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between px-2">
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
              <button type="button" onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <p className="text-2xl font-semibold text-foreground">Total: {formatCurrency(total)}</p>
        <div className="flex gap-3">
          <Link href="/dashboard/quotes" className="rounded-xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {status === 'loading' ? 'Saving...' : initialQuote ? 'Update Quote' : 'Create Quote'}
          </button>
        </div>
      </div>
      {status === 'error' && <p className="text-sm text-destructive">Failed to save.</p>}
    </form>
  )
}
