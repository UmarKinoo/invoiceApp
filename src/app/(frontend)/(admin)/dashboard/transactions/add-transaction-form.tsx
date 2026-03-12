'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getClients } from '../clients/actions'
import { createTransaction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

type InvoiceOption = { id: number; invoiceNumber: string | null }

export function AddTransactionForm({ invoices = [] }: { invoices?: InvoiceOption[] }) {
  const router = useRouter()
  const [clients, setClients] = useState<{ id: number; name: string | null; company: string | null; email: string | null }[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    clientId: '',
    invoiceId: '',
    reference: '',
    method: 'stripe',
    notes: '',
  })

  useEffect(() => {
    getClients(500).then((res) => setClients(res.docs))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.clientId) return
    setStatus('loading')
    const result = await createTransaction({
      type: form.type,
      date: form.date,
      amount: form.amount,
      client: Number(form.clientId),
      invoice: form.invoiceId ? Number(form.invoiceId) : undefined,
      reference: form.reference || undefined,
      method: form.method,
      notes: form.notes || undefined,
    })
    if (result.doc) {
      setOpen(false)
      setForm({
        type: 'income',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        clientId: '',
        invoiceId: '',
        reference: '',
        method: 'stripe',
        notes: '',
      })
      router.refresh()
    } else {
      setStatus('error')
    }
    setStatus('idle')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          <span className="hidden lg:inline">Log transaction</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((p) => ({ ...p, type: v as 'income' | 'expense' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <Label>{form.type === 'income' ? 'Client' : 'Payee / vendor'}</Label>
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
          {form.type === 'income' && invoices.length > 0 && (
            <div className="space-y-2">
              <Label>Link to invoice (optional)</Label>
              <Select
                value={form.invoiceId || '__none__'}
                onValueChange={(v) => setForm((p) => ({ ...p, invoiceId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={String(inv.id)}>
                      {inv.invoiceNumber ?? `#${inv.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              placeholder="e.g. PAY-001 or invoice number"
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
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="resize-none"
            />
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
