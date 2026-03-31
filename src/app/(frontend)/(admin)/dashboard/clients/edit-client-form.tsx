'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client } from '@/payload-types'
import { updateClient } from './actions'

export function EditClientForm({ client }: { client: Client }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [form, setForm] = useState({
    name: client.name ?? '',
    company: client.company ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    brn: (client as { brn?: string | null }).brn ?? '',
    vatNumber: (client as { vatNumber?: string | null }).vatNumber ?? '',
    address: client.address ?? '',
  })
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: { name?: string; phone?: string } = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.phone.trim()) nextErrors.phone = 'Phone is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setStatus('loading')
    const result = await updateClient(client.id, {
      name: form.name.trim(),
      company: form.company || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      brn: form.brn || undefined,
      vatNumber: form.vatNumber || undefined,
      address: form.address || undefined,
    })
    if (result.doc) {
      router.push(`/dashboard/clients/${client.id}`)
      router.refresh()
    } else {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-border bg-card p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold uppercase tracking-tight text-foreground">Edit client</h3>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        <div className="space-y-1">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="Full Name"
            className={`w-full rounded-xl border bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 ${
              errors.name ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
            }`}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          {errors.name && <p className="px-2 text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</label>
          <input
            type="text"
            placeholder="Company Name"
            className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.company}
            onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Phone <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            placeholder="+1 (000) 000-0000"
            className={`w-full rounded-xl border bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 ${
              errors.phone ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
            }`}
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          {errors.phone && <p className="px-2 text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Email (optional)
          </label>
          <input
            type="email"
            placeholder="email@provider.com"
            className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            BRN (optional)
          </label>
          <input
            type="text"
            placeholder="Business Registration Number"
            className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.brn}
            onChange={(e) => setForm((p) => ({ ...p, brn: e.target.value }))}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            VAT number (optional)
          </label>
          <input
            type="text"
            placeholder="Only if VAT registered"
            className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.vatNumber}
            onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))}
          />
        </div>
      </div>
      <div className="mb-6 space-y-1">
        <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Address</label>
        <textarea
          placeholder="Address"
          className="min-h-[80px] w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
      </div>
      {status === 'error' && (
        <p className="mb-4 text-sm text-destructive">Failed to save. Try again.</p>
      )}
      <div className="flex gap-3">
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="flex-1 rounded-xl border border-border bg-muted py-3.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-1 rounded-xl bg-primary py-3.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
