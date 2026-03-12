'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, Receipt, Upload, ImageIcon } from 'lucide-react'
import { updateSettings } from './actions'
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
  logo: { url: string; id: number } | null
  logoWhite: { url: string; id: number } | null
  businessBrn: string
  vatRegistrationNumber: string
  invoicePrefix: string
  taxRateDefault: number
  currency: string
}

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileWhiteInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoWhiteUploading, setLogoWhiteUploading] = useState(false)
  const [form, setForm] = useState(initial)
  const logoDisplayUrl = form.logo?.url || form.logoUrl || null
  const logoWhiteDisplayUrl = form.logoWhite?.url || null

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('alt', 'Company logo')
      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.errors?.[0]?.message ?? err?.message ?? 'Upload failed')
      }
      const data = await res.json()
      const doc = data?.doc ?? data
      const id = doc?.id
      if (id == null) throw new Error('No media id returned')
      const { logo: _logo, logoWhite: _logoWhite, ...rest } = form
      await updateSettings({
        ...rest,
        logo: Number(id),
        logoWhite: _logoWhite?.id ?? undefined,
      })
      setForm((p) => ({
        ...p,
        logo: { url: doc?.url ?? logoDisplayUrl ?? '', id: Number(id) },
        logoUrl: doc?.url ?? p.logoUrl,
      }))
      router.refresh()
    } catch (err) {
      console.error('Logo upload failed:', err)
      setStatus('idle')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLogoWhiteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoWhiteUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('alt', 'Company logo (white background)')
      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.errors?.[0]?.message ?? err?.message ?? 'Upload failed')
      }
      const data = await res.json()
      const doc = data?.doc ?? data
      const id = doc?.id
      if (id == null) throw new Error('No media id returned')
      const { logo: _logo, logoWhite: _logoWhite, ...rest } = form
      await updateSettings({
        ...rest,
        logo: _logo?.id ?? undefined,
        logoWhite: Number(id),
      })
      setForm((p) => ({
        ...p,
        logoWhite: { url: doc?.url ?? '', id: Number(id) },
      }))
      router.refresh()
    } catch (err) {
      console.error('Logo (white) upload failed:', err)
      setStatus('idle')
    } finally {
      setLogoWhiteUploading(false)
      e.target.value = ''
      if (fileWhiteInputRef.current) fileWhiteInputRef.current.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const payload = {
      ...form,
      logo: form.logo?.id ?? undefined,
      logoWhite: form.logoWhite?.id ?? undefined,
    }
    const result = await updateSettings(payload)
    if (result.ok) {
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 2000)
    } else {
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
            <Label>Logo</Label>
            <div className="flex flex-wrap items-center gap-4">
              {logoDisplayUrl ? (
                <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/50">
                  <img src={logoDisplayUrl} alt="Company logo" className="max-h-14 max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                  <ImageIcon className="size-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {logoUploading ? 'Uploading…' : 'Upload logo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG or JPG. Used on screen and dark backgrounds.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">Or logo URL (fallback)</Label>
              <Input
                id="logoUrl"
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Logo for white background</Label>
            <div className="flex flex-wrap items-center gap-4">
              {logoWhiteDisplayUrl ? (
                <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  <img src={logoWhiteDisplayUrl} alt="Logo for white background" className="max-h-14 max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                  <ImageIcon className="size-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileWhiteInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoWhiteUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoWhiteUploading}
                  onClick={() => fileWhiteInputRef.current?.click()}
                  className="gap-2"
                >
                  {logoWhiteUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {logoWhiteUploading ? 'Uploading…' : 'Upload logo (white bg)'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Used on PDF and print. Falls back to main logo if not set.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessBrn">BRN (Business Registration No.)</Label>
            <Input
              id="businessBrn"
              value={form.businessBrn}
              onChange={(e) => setForm((p) => ({ ...p, businessBrn: e.target.value }))}
              placeholder="e.g. C13117289"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatRegistrationNumber">VAT registration number</Label>
            <Input
              id="vatRegistrationNumber"
              value={form.vatRegistrationNumber}
              onChange={(e) => setForm((p) => ({ ...p, vatRegistrationNumber: e.target.value }))}
              placeholder="e.g. VAT27229699"
            />
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
