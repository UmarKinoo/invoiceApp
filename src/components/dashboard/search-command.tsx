'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

type SearchResult = {
  clients: { id: number; name?: string | null; company?: string | null; email?: string | null }[]
  invoices: { id: number; invoiceNumber?: string | null; total?: number; client?: { name?: string | null } | number }[]
  quotes: { id: number; quoteNumber?: string | null; total?: number; client?: { name?: string | null } | number }[]
}

export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ clients: [], invoices: [], quotes: [] })
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults({ clients: [], invoices: [], quotes: [] })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
    } catch {
      setResults({ clients: [], invoices: [], quotes: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, runSearch])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
        if (!open) setQuery('')
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open])

  const hasResults =
    results.clients.length > 0 || results.invoices.length > 0 || results.quotes.length > 0

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search contacts, invoices, and quotes"
    >
      <CommandInput
        placeholder="Search contacts, invoices, quotes..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>
          {loading ? 'Searching...' : query.length < 2 ? 'Type at least 2 characters' : 'No results.'}
        </CommandEmpty>
        {results.clients.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.clients.map((c) => (
              <CommandItem
                key={c.id}
                value={`client-${c.id}`}
                onSelect={() => {
                  router.push(`/dashboard/clients/${c.id}`)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{c.name ?? c.email ?? '—'}</span>
                {c.company && <span className="ml-2 text-muted-foreground">({c.company})</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.invoices.length > 0 && (
          <CommandGroup heading="Invoices">
            {results.invoices.map((inv) => (
              <CommandItem
                key={inv.id}
                value={`invoice-${inv.id}`}
                onSelect={() => {
                  router.push(`/dashboard/invoices/${inv.id}`)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{inv.invoiceNumber ?? `#${inv.id}`}</span>
                <span className="ml-2 text-muted-foreground">
                  ${typeof inv.total === 'number' ? inv.total.toFixed(2) : '—'}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.quotes.length > 0 && (
          <CommandGroup heading="Quotes">
            {results.quotes.map((q) => (
              <CommandItem
                key={q.id}
                value={`quote-${q.id}`}
                onSelect={() => {
                  router.push(`/dashboard/quotes/${q.id}`)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{q.quoteNumber ?? `#${q.id}`}</span>
                <span className="ml-2 text-muted-foreground">
                  ${typeof q.total === 'number' ? q.total.toFixed(2) : '—'}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
