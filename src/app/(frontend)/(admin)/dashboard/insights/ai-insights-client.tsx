'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

export function AIInsightsClient() {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchInsights = async () => {
    setLoading(true)
    setInsight('')
    try {
      const res = await fetch('/api/ai/insights')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setInsight(data.text ?? 'No insights generated.')
    } catch {
      setInsight(
        'Awaiting data synchronization. Finalize active invoices to unlock deep analytics. Ensure GEMINI_API_KEY is set for AI insights.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <div className="relative z-10 flex items-center justify-between border-b border-border bg-card/95 p-10 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground animate-pulse">
            <Sparkles className="size-8" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold uppercase tracking-tight text-foreground">
              AI Insights
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status: Active
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border bg-primary px-8 py-3.5 text-xs font-medium uppercase tracking-wider text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-30"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Refresh
        </button>
      </div>
      <div className="relative z-10 p-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="flex gap-3">
              <div className="size-4 animate-bounce rounded-full bg-primary/80 [animation-delay:-0.3s]" />
              <div className="size-4 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
              <div className="size-4 animate-bounce rounded-full bg-primary" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Processing…
            </p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-foreground">
              {insight ||
                'Awaiting data synchronization. Finalize active invoices to unlock deep analytics.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
