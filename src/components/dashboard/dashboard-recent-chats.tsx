'use client'

import Link from 'next/link'
import { Bot, MessageSquarePlus, Sparkles } from 'lucide-react'
import type { AgentSessionSummary } from '@/lib/agent/list-sessions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const agentVibeShell =
  'relative overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-cyan-500/10 shadow-[0_0_32px_-12px_rgba(139,92,246,0.45)]'

const agentVibeGlow =
  'pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/15 via-transparent to-cyan-400/15'

function formatWhen(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

type Props = {
  sessions: AgentSessionSummary[]
}

export function DashboardRecentChats({ sessions }: Props) {
  const hasSessions = sessions.length > 0
  const visible = sessions.slice(0, 3)

  return (
    <div className={cn(agentVibeShell, 'p-3 sm:p-4')}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
        <div className="agent-ai-shimmer absolute -inset-y-6 left-0 w-[42%] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>
      <span className={agentVibeGlow} aria-hidden />

      <div
        className="agent-ai-enter relative flex items-center justify-between gap-3"
        style={{ animationDelay: '0.05s' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-200">
            <Bot className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Swiftbook Agent
            </h4>
            <p className="truncate text-[11px] text-muted-foreground">
              {hasSessions ? 'Pick up where you left off' : 'Voice & chat CRM assistant'}
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="relative h-8 shrink-0 gap-1 border-violet-500/30 bg-violet-500/10 text-foreground shadow-none hover:border-violet-400/40 hover:bg-violet-500/20"
        >
          <Link href="/dashboard/agent">
            {hasSessions ? (
              <>
                <MessageSquarePlus className="size-3.5" />
                <span className="hidden sm:inline">New chat</span>
                <span className="sm:hidden">New</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Try agent</span>
              </>
            )}
          </Link>
        </Button>
      </div>

      {hasSessions ? (
        <ul className="relative mt-2.5 space-y-1.5">
          {visible.map((session, index) => (
            <li
              key={session.id}
              className="agent-ai-enter"
              style={{ animationDelay: `${180 + index * 70}ms` }}
            >
              <Link
                href={`/dashboard/agent?thread=${session.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-background/40 px-3 py-2 transition-colors hover:border-violet-500/25 hover:bg-violet-500/10"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {session.title}
                </p>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {formatWhen(session.lastMessageAt) || 'Recent'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="agent-ai-enter relative mt-2 text-xs leading-snug text-muted-foreground"
          style={{ animationDelay: '0.22s' }}
        >
          Draft invoices, find clients, or check balances — start a conversation in plain
          language.
        </p>
      )}

      {hasSessions && sessions.length > 3 ? (
        <Link
          href="/dashboard/agent"
          className="agent-ai-enter relative mt-2 block text-center text-[11px] font-medium text-violet-300/90 hover:text-violet-200"
          style={{ animationDelay: '0.42s' }}
        >
          View all chats
        </Link>
      ) : null}
    </div>
  )
}
