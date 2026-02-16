'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Client } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AddTransactionForm() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    clientId: '',
    reference: '',
    method: 'stripe',
  })

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then((r) => r.json())
      .then((data) => setClients(data.docs ?? []))
      .catch(() => setClients([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.clientId) return
    setStatus('loading')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          amount: form.amount,
          client: Number(form.clientId),
          reference: form.reference || undefined,
          method: form.method,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setOpen(false)
      setForm({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        clientId: '',
        reference: '',
        method: 'stripe',
      })
      router.refresh()
    } catch {
      setStatus('error')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          <span className="hidden lg:inline">Log Payment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.amount || ''}
              onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={form.clientId || undefined}
              onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name ?? '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              placeholder="e.g. INV-001"
              value={form.reference}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={form.method}
              onValueChange={(v) => setForm((p) => ({ ...p, method: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === 'error' && (
            <p className="text-sm text-destructive">Failed to save.</p>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
