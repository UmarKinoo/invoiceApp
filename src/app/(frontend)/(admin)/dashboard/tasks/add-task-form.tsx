'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client } from '@/payload-types'

export function AddTaskForm() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    fetch('/api/clients?limit=500')
      .then((r) => r.json())
      .then((data) => setClients(data.docs ?? []))
      .catch(() => setClients([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || undefined,
          priority,
          client: clientId ? Number(clientId) : undefined,
          completed: false,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard/tasks')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6">
      <div>
        <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Title
        </label>
        <input
          placeholder="Task title"
          className="w-full rounded-xl border border-input bg-background px-5 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Due date
          </label>
          <input
            type="date"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Priority
          </label>
          <select
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-2 block px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Link to contact (optional)
        </label>
        <select
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">No contact</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {status === 'error' && <p className="text-sm text-destructive">Failed to save.</p>}
      <div className="flex gap-3">
        <Link
          href="/dashboard/tasks"
          className="flex-1 rounded-xl border border-border bg-muted py-3.5 text-center text-sm font-medium text-foreground"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving...' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
