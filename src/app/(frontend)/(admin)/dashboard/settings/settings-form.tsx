'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type Initial = {
  businessName: string
  businessAddress: string
  businessEmail: string
  businessPhone: string
  businessWebsite: string
  logoUrl: string
  invoicePrefix: string
  taxRateDefault: number
  currency: string
}

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [form, setForm] = useState(initial)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    try {
      const res = await fetch('/api/globals/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Your business details appear on invoices and quotes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={form.businessName}
              onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Email</Label>
            <Input
              id="businessEmail"
              type="email"
              value={form.businessEmail}
              onChange={(e) => setForm((p) => ({ ...p, businessEmail: e.target.value }))}
              placeholder="billing@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessPhone">Phone</Label>
            <Input
              id="businessPhone"
              type="tel"
              value={form.businessPhone}
              onChange={(e) => setForm((p) => ({ ...p, businessPhone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessWebsite">Website</Label>
            <Input
              id="businessWebsite"
              type="url"
              value={form.businessWebsite}
              onChange={(e) => setForm((p) => ({ ...p, businessWebsite: e.target.value }))}
              placeholder="https://acme.com"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessAddress">Address</Label>
            <Textarea
              id="businessAddress"
              value={form.businessAddress}
              onChange={(e) => setForm((p) => ({ ...p, businessAddress: e.target.value }))}
              placeholder="Street, city, postal code"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Optional. Used on exported invoices and PDFs.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Invoice numbering and default tax.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(value) => setForm((p) => ({ ...p, currency: value }))}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MUR">MUR (Rs)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice number prefix</Label>
            <Input
              id="invoicePrefix"
              value={form.invoicePrefix}
              onChange={(e) => setForm((p) => ({ ...p, invoicePrefix: e.target.value }))}
              placeholder="INV-"
            />
            <p className="text-xs text-muted-foreground">
              e.g. INV-001, QT-001
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRateDefault">Default tax rate (%)</Label>
            <Input
              id="taxRateDefault"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.taxRateDefault}
              onChange={(e) =>
                setForm((p) => ({ ...p, taxRateDefault: Number(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {status === 'saved' && 'Settings saved.'}
        </p>
        <Button type="submit" disabled={status === 'saving'} size="lg">
          {status === 'saving' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : status === 'saved' ? (
            'Saved'
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </form>
  )
}
