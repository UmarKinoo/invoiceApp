'use client'

import { Loader2, MessageSquarePlus, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type AgentSessionItem = {
  id: string
  title: string
  lastMessageAt: string
}

type Props = {
  sessions: AgentSessionItem[]
  activeId: string | null
  loading: boolean
  disabled?: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  onHide?: () => void
}

function formatWhen(iso: string): string {
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

export function AgentSessionList({
  sessions,
  activeId,
  loading,
  disabled,
  onSelect,
  onNewChat,
  onHide,
}: Props) {
  return (
    <div
      data-testid="agent-chats-panel"
      className="flex h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r border-border"
    >
      <div className="shrink-0 space-y-2 border-b border-border p-2">
        <div className="flex items-center justify-between gap-1 px-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chats
          </span>
          {onHide ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onHide}
              aria-label="Hide chats"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
          disabled={disabled}
        >
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>
      <ScrollArea className="h-0 min-h-0 flex-1">
        <div className="space-y-0.5 p-2">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : null}
          {!loading && sessions.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No past chats yet. Start a conversation.
            </p>
          ) : null}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s.id)}
              className={cn(
                'w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                'hover:bg-muted disabled:opacity-50',
                activeId === s.id && 'bg-muted font-medium',
              )}
            >
              <div className="line-clamp-2 leading-snug">{s.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{formatWhen(s.lastMessageAt)}</div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
