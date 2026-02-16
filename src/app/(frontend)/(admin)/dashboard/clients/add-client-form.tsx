'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function AddClientForm() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create')
      router.push('/dashboard/clients')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-border bg-card p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold uppercase tracking-tight text-foreground">New client</h3>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        {[
          { key: 'name', label: 'Name', placeholder: 'Full Name' },
          { key: 'company', label: 'Company', placeholder: 'Company Name' },
          { key: 'email', label: 'Email', placeholder: 'email@provider.com', type: 'email' },
          { key: 'phone', label: 'Phone', placeholder: '+1 (000) 000-0000', type: 'tel' },
        ].map(({ key, label, placeholder, type = 'text' }) => (
          <div key={key} className="space-y-1">
            <label className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
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
          href="/dashboard/clients"
          className="flex-1 rounded-xl border border-border bg-muted py-3.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Discard
        </Link>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-1 rounded-xl bg-primary py-3.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
  )
}
