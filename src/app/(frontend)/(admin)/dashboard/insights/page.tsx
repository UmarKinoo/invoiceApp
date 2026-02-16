'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Loader2, Zap, TrendingUp, Cpu, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function InsightsPage() {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/insights')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setInsight(data.text ?? 'No insights generated.')
    } catch {
      setInsight(
        'Awaiting data synchronization. Finalize active invoices to unlock deep analytics.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <PageHeader
        title="AI Insights"
        description="Analysis of your enterprise ecosystem."
      />

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
        <div className="relative z-10 flex items-center justify-between border-b border-border bg-card/80 p-8 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Brain className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                Synthesizing reports
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status: Active
              </p>
            </div>
          </div>
          <Button onClick={fetchInsights} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            Refresh
          </Button>
        </div>

        <CardContent className="relative z-10 p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-24">
              <div className="flex gap-2">
                <div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <div className="size-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]" />
                <div className="size-2 rounded-full bg-primary animate-bounce" />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Processing...
              </p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                {insight ||
                  'Awaiting data synchronization. Finalize active invoices to unlock deep analytics.'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { icon: TrendingUp, title: 'Trajectory', desc: 'Predictive revenue models based on historical velocity.', color: 'text-emerald-600 dark:text-emerald-400' },
          { icon: Cpu, title: 'Risk detection', desc: 'Auto-detection of high-risk payment delays.', color: 'text-amber-600 dark:text-amber-400' },
          { icon: Sparkles, title: 'Brand tone', desc: 'Personalized outreach optimized for conversion.', color: 'text-primary' },
        ].map((item, i) => (
          <Card key={i} className="transition-colors hover:bg-card/80">
            <CardContent className="p-6">
              <item.icon className={`mb-4 size-8 ${item.color}`} />
              <h5 className="mb-2 font-semibold uppercase tracking-wider text-foreground">
                {item.title}
              </h5>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
