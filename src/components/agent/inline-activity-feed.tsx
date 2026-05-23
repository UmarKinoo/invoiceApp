'use client'

import { Check, Circle, Loader2 } from 'lucide-react'
import type { AgentActivity } from '@/lib/agent/activity'
import { cn } from '@/lib/utils'

type Props = {
  activities: AgentActivity[]
  streamActive?: boolean
  queueCount?: number
}

function StepIcon({ status }: { status: AgentActivity['status'] }) {
  if (status === 'running') {
    return <Loader2 className="size-3 shrink-0 animate-spin text-primary/80" />
  }
  if (status === 'completed') {
    return <Check className="size-3 shrink-0 text-muted-foreground/50" />
  }
  if (status === 'error') {
    return <Circle className="size-3 shrink-0 fill-destructive/80 text-destructive/80" />
  }
  return <Circle className="size-3 shrink-0 animate-pulse text-muted-foreground/40" />
}

export function InlineActivityFeed({ activities, streamActive, queueCount = 0 }: Props) {
  if (activities.length === 0 && !streamActive && queueCount === 0) return null

  return (
    <div
      className="max-w-full animate-in fade-in slide-in-from-bottom-1 duration-300 sm:ml-9 sm:max-w-md"
      aria-live="polite"
      aria-label="Agent progress"
    >
      <ul className="flex flex-col gap-0.5 border-l border-border/60 pl-3">
        {activities.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-all duration-500 ease-out',
              'animate-in fade-in slide-in-from-left-1',
              item.status === 'running' && 'text-muted-foreground',
              item.status === 'completed' && 'text-muted-foreground/45',
              item.status === 'error' && 'text-destructive/80',
              item.status === 'pending' && 'text-muted-foreground/60',
            )}
            style={{ animationDelay: `${Math.min(index, 6) * 40}ms`, animationFillMode: 'backwards' }}
          >
            <StepIcon status={item.status} />
            <span className="truncate">{item.label}</span>
          </li>
        ))}
        {streamActive && activities.every((a) => a.status === 'completed') && (
          <li className="flex items-center gap-2 text-xs text-muted-foreground/50 animate-in fade-in duration-300">
            <Loader2 className="size-3 shrink-0 animate-spin" />
            <span>Working…</span>
          </li>
        )}
      </ul>
      {queueCount > 0 ? (
        <p className="mt-1.5 pl-3 text-[10px] text-muted-foreground/50 animate-in fade-in duration-300">
          {queueCount} message{queueCount > 1 ? 's' : ''} queued
        </p>
      ) : null}
    </div>
  )
}
