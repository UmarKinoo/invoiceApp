'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, ExternalLink, History, Loader2, PanelLeftOpen, Send, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AgentActivity } from '@/lib/agent/activity'
import type { AgentHistoryMessage } from '@/lib/agent/history'
import {
  AgentSessionList,
  type AgentSessionItem,
} from '@/components/agent/agent-session-list'
import { InlineActivityFeed } from '@/components/agent/inline-activity-feed'
import { AgentMessageContent } from '@/components/agent/agent-message-content'
import { useAgentPanels } from '@/components/agent/use-agent-panels'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useHydrated } from '@/hooks/use-hydrated'
import { useIsMobile } from '@/hooks/use-mobile'

type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; content: string; streaming?: boolean }
  | { id: string; role: 'interrupt'; question: string }
  | {
      id: string
      role: 'draft_link'
      url: string
      invoiceId: number
      invoiceNumber: string
    }

type StreamEvent =
  | { type: 'session'; threadId: string }
  | { type: 'status'; message: string }
  | { type: 'activity'; activity: AgentActivity }
  | { type: 'token'; content: string }
  | { type: 'assistant'; content: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; output: string }
  | { type: 'interrupt'; question: string }
  | { type: 'final'; content: string }
  | { type: 'error'; error: string }
  | {
      type: 'draft_link'
      url: string
      invoiceId: number
      invoiceNumber: string
    }
  | { type: 'done' }

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function upsertActivity(list: AgentActivity[], next: AgentActivity): AgentActivity[] {
  const idx = list.findIndex((a) => a.id === next.id)
  if (idx >= 0) {
    const copy = [...list]
    copy[idx] = next
    return copy
  }
  return [...list, next]
}

function historyToChatMessages(history: AgentHistoryMessage[]): ChatMessage[] {
  return history.map((m) => {
    const id = newId()
    switch (m.role) {
      case 'user':
        return { id, role: 'user', content: m.content }
      case 'assistant':
        return { id, role: 'assistant', content: m.content }
      case 'interrupt':
        return { id, role: 'interrupt', question: m.question }
      case 'draft_link':
        return {
          id,
          role: 'draft_link',
          url: m.url,
          invoiceId: m.invoiceId,
          invoiceNumber: m.invoiceNumber,
        }
    }
  })
}

type AgentWorkspaceProps = {
  /** Exposes `window.__agentE2e` for Playwright when AGENT_E2E_MOCK=1 on the server. */
  enableE2eBridge?: boolean
}

function AgentWorkspaceInner({ enableE2eBridge = false }: AgentWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [sessions, setSessions] = useState<AgentSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [input, setInput] = useState('')
  const [streamActive, setStreamActive] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [awaitingResume, setAwaitingResume] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queueRef = useRef<string[]>([])
  const streamActiveRef = useRef(false)
  const awaitingResumeRef = useRef(false)
  const threadIdRef = useRef<string | null>(null)
  const initialUrlHandled = useRef(false)
  const { chatsOpen, setChatsOpen, toggleChats } = useAgentPanels()
  const hydrated = useHydrated()
  const isMobileViewport = useIsMobile()
  const isMobile = hydrated && isMobileViewport

  threadIdRef.current = threadId

  const closeChatsPanel = useCallback(() => setChatsOpen(false), [setChatsOpen])

  const setThreadInUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set('thread', id)
      else params.delete('thread')
      const q = params.toString()
      router.replace(q ? `/dashboard/agent?${q}` : '/dashboard/agent', { scroll: false })
    },
    [router, searchParams],
  )

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/sessions')
      if (!res.ok) return
      const data = (await res.json()) as { sessions: AgentSessionItem[] }
      setSessions(data.sessions ?? [])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  const loadThread = useCallback(
    async (id: string, options?: { skipUrl?: boolean }) => {
      if (streamActiveRef.current) return
      setHistoryLoading(true)
      setStatus(null)
      setActivities([])
      try {
        const res = await fetch(`/api/agent/sessions/${id}/history`)
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error ?? `Failed to load chat (${res.status})`)
        }
        const data = (await res.json()) as {
          messages: AgentHistoryMessage[]
          pendingInterrupt: string | null
        }
        setThreadId(id)
        setMessages(historyToChatMessages(data.messages ?? []))
        const pending = Boolean(data.pendingInterrupt)
        awaitingResumeRef.current = pending
        setAwaitingResume(pending)
        if (!options?.skipUrl) setThreadInUrl(id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load chat'
        setMessages([{ id: newId(), role: 'assistant', content: `Error: ${message}` }])
      } finally {
        setHistoryLoading(false)
      }
    },
    [setThreadInUrl],
  )

  const startNewChat = useCallback(() => {
    if (streamActiveRef.current) return
    queueRef.current = []
    setQueueCount(0)
    setThreadId(null)
    setMessages([])
    setActivities([])
    awaitingResumeRef.current = false
    setAwaitingResume(false)
    setStatus(null)
    setThreadInUrl(null)
  }, [setThreadInUrl])

  const selectSession = useCallback(
    (id: string) => {
      void loadThread(id)
      if (isMobile) closeChatsPanel()
    },
    [loadThread, isMobile, closeChatsPanel],
  )

  const handleNewChat = useCallback(() => {
    startNewChat()
    if (isMobile) closeChatsPanel()
  }, [startNewChat, isMobile, closeChatsPanel])

  useEffect(() => {
    if (initialUrlHandled.current) return
    initialUrlHandled.current = true
    const fromUrl = searchParams.get('thread')
    if (fromUrl) void loadThread(fromUrl, { skipUrl: true })
  }, [searchParams, loadThread])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status, activities])

  const runStream = useCallback(async (text: string) => {
    streamActiveRef.current = true
    setStreamActive(true)
    setStatus('Sending…')

    const wasResuming = awaitingResumeRef.current
    awaitingResumeRef.current = false
    setAwaitingResume(false)
    setActivities([])

    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: text }])
    const assistantId = newId()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }])

    const activeThread = threadIdRef.current

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          threadId: activeThread,
          resume: wasResuming,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `Request failed (${response.status})`)
      }
      if (!response.body) throw new Error('Empty response body from agent')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.startsWith('data: ') ? part.slice(6) : part.trim()
          if (!line) continue
          let event: StreamEvent
          try {
            event = JSON.parse(line) as StreamEvent
          } catch {
            continue
          }

          if (event.type === 'session') {
            setThreadId(event.threadId)
            setThreadInUrl(event.threadId)
            void refreshSessions()
          } else if (event.type === 'activity') {
            setActivities((prev) => upsertActivity(prev, event.activity))
          } else if (event.type === 'status') {
            setStatus(event.message)
          } else if (event.type === 'token') {
            setStatus(null)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === 'assistant'
                  ? { ...m, content: m.content + event.content }
                  : m,
              ),
            )
          } else if (event.type === 'assistant' || event.type === 'final') {
            setStatus(null)
            const content = event.type === 'final' ? event.content : event.content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === 'assistant'
                  ? {
                      ...m,
                      content: m.content || content,
                      streaming: event.type !== 'final',
                    }
                  : m,
              ),
            )
            if (event.type === 'final') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId && m.role === 'assistant' ? { ...m, streaming: false } : m,
                ),
              )
            }
          } else if (event.type === 'interrupt') {
            setStatus('Waiting for your reply')
            awaitingResumeRef.current = true
            setAwaitingResume(true)
            setMessages((prev) => [
              ...prev.map((m) =>
                m.id === assistantId && m.role === 'assistant' ? { ...m, streaming: false } : m,
              ),
              { id: newId(), role: 'interrupt', question: event.question },
            ])
          } else if (event.type === 'draft_link') {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: 'draft_link',
                url: event.url,
                invoiceId: event.invoiceId,
                invoiceNumber: event.invoiceNumber,
              },
            ])
          } else if (event.type === 'error') {
            setStatus(null)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === 'assistant'
                  ? { ...m, content: `Error: ${event.error}`, streaming: false }
                  : m,
              ),
            )
          } else if (event.type === 'done') {
            setStatus(null)
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId || m.role !== 'assistant') return m
                if (m.streaming && !m.content) {
                  return {
                    ...m,
                    streaming: false,
                    content: '(See steps above or confirmation below.)',
                  }
                }
                return { ...m, streaming: false }
              }),
            )
            void refreshSessions()
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setStatus(null)
      setMessages((prev) =>
        prev.map((m) =>
          m.role === 'assistant' && m.streaming
            ? { ...m, content: `Error: ${message}`, streaming: false }
            : m,
        ),
      )
    } finally {
      streamActiveRef.current = false
      setStreamActive(false)
      setStatus((s) => (s?.startsWith('Sending') ? null : s))

      const next = queueRef.current.shift()
      setQueueCount(queueRef.current.length)
      if (next) void runStream(next)
    }
  }, [refreshSessions, setThreadInUrl])

  const submitMessage = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return

      if (streamActiveRef.current) {
        queueRef.current.push(text)
        setQueueCount(queueRef.current.length)
        setMessages((prev) => [...prev, { id: newId(), role: 'user', content: text }])
        return
      }

      void runStream(text)
    },
    [runStream],
  )

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    submitMessage(text)
  }

  useEffect(() => {
    if (!enableE2eBridge) return
    const w = window as Window & {
      __agentE2e?: { submit: (text: string) => void; setChatsOpen: (open: boolean) => void }
    }
    w.__agentE2e = {
      submit: (text) => {
        setInput('')
        submitMessage(text)
      },
      setChatsOpen: (open: boolean) => setChatsOpen(open),
    }
    return () => {
      delete w.__agentE2e
    }
  }, [enableE2eBridge, submitMessage, setChatsOpen])

  const activeSessionTitle =
    sessions.find((s) => s.id === threadId)?.title ??
    (threadId ? `Chat #${threadId}` : 'New conversation')

  const uiDisabled = streamActive || historyLoading

  const sessionList = (
    <AgentSessionList
      sessions={sessions}
      activeId={threadId}
      loading={sessionsLoading}
      disabled={uiDisabled}
      className={isMobile ? 'w-full border-r-0' : undefined}
      onSelect={selectSession}
      onNewChat={handleNewChat}
      onHide={closeChatsPanel}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <Card className="flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-lg border-0 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:shadow-sm">
        {!isMobile && !chatsOpen ? (
          <div className="flex w-11 shrink-0 flex-col items-center border-r border-border py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 touch-manipulation"
                  onClick={() => setChatsOpen(true)}
                  aria-label="Show chats"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Show chats</TooltipContent>
            </Tooltip>
          </div>
        ) : null}
        {!isMobile && chatsOpen ? sessionList : null}

        {isMobile ? (
          <Sheet open={chatsOpen} onOpenChange={setChatsOpen}>
            <SheetContent
              side="left"
              className="flex h-full w-[min(100vw,20rem)] max-w-[85vw] flex-col gap-0 p-0 sm:max-w-xs [&>button]:top-3 [&>button]:right-3"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Chat history</SheetTitle>
                <SheetDescription>Past agent conversations</SheetDescription>
              </SheetHeader>
              {sessionList}
            </SheetContent>
          </Sheet>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
            <Bot className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight">CRM Assistant</h3>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {activeSessionTitle}
                {status ? ` · ${status}` : ''}
                {streamActive ? ' · working' : ''}
                {historyLoading ? ' · loading…' : ''}
              </p>
            </div>
            <Button
              type="button"
              variant={chatsOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-2.5 touch-manipulation sm:h-8"
              onClick={toggleChats}
              aria-pressed={chatsOpen}
              aria-label={chatsOpen ? 'Hide chats' : 'Show chats'}
            >
              <History className="size-4" />
              <span className="text-xs sm:text-sm">Chats</span>
            </Button>
            {(streamActive || historyLoading) && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-3 sm:space-y-4 sm:p-4"
          >
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading conversation…
              </div>
            ) : null}
            {!historyLoading && messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground sm:p-6">
                Ask me to find a client or draft an invoice. Chats are saved
                {isMobile || !chatsOpen
                  ? ' — tap Chats to switch threads'
                  : ' — pick a past conversation on the left'}.
              </div>
            ) : null}

            {!historyLoading &&
              messages.map((m) => {
                if (m.role === 'user') {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="flex max-w-[min(92%,28rem)] items-end gap-1.5 sm:max-w-[80%] sm:items-start sm:gap-2">
                        <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[15px] leading-snug text-primary-foreground sm:px-4 sm:text-sm">
                          {m.content}
                        </div>
                        <div className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mt-1 sm:flex">
                          <User className="size-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  )
                }
                if (m.role === 'interrupt') {
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-amber-500/50 bg-amber-500/5 px-3 py-2.5 text-sm sm:ml-9 sm:px-4 sm:py-3"
                    >
                      <div className="font-medium text-amber-700 dark:text-amber-400">
                        Confirmation required
                      </div>
                      <AgentMessageContent content={m.question} className="mt-1 text-foreground" />
                    </div>
                  )
                }
                if (m.role === 'draft_link') {
                  return (
                    <div key={m.id} className="sm:ml-9">
                      <Button asChild size="sm" className="h-10 w-full gap-2 touch-manipulation sm:h-8 sm:w-auto">
                        <Link href={`/dashboard/invoices/${m.invoiceId}`}>
                          Review draft {m.invoiceNumber}
                          <ExternalLink className="size-3.5 opacity-70" />
                        </Link>
                      </Button>
                    </div>
                  )
                }
                return (
                  <div key={m.id} className="flex items-start gap-1.5 sm:gap-2">
                    <div className="mt-0.5 hidden size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mt-1 sm:flex">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="max-w-[min(92%,28rem)] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-[15px] leading-snug sm:max-w-[80%] sm:px-4 sm:text-sm">
                      <AgentMessageContent
                        content={m.content}
                        streaming={m.streaming}
                        className={cn(!m.content && m.streaming && 'opacity-60')}
                      />
                    </div>
                  </div>
                )
              })}

            {!historyLoading && (activities.length > 0 || streamActive || queueCount > 0) ? (
              <InlineActivityFeed
                activities={activities}
                streamActive={streamActive}
                queueCount={queueCount}
              />
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border bg-background/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:p-3">
            <div className="flex items-end gap-2">
              <Textarea
                data-testid="agent-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  awaitingResume
                    ? 'Confirm or clarify…'
                    : streamActive
                      ? 'Keep typing — message will queue…'
                      : 'Message…'
                }
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none text-base leading-snug sm:min-h-9 sm:text-sm"
                disabled={historyLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || historyLoading}
                size="icon"
                className="size-10 shrink-0 touch-manipulation sm:size-9"
                aria-label="Send message"
              >
                {streamActive && !input.trim() ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AgentWorkspaceFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Loading agent…
    </div>
  )
}

export function AgentWorkspace({ enableE2eBridge = false }: AgentWorkspaceProps) {
  return (
    <Suspense fallback={<AgentWorkspaceFallback />}>
      <AgentWorkspaceInner enableE2eBridge={enableE2eBridge} />
    </Suspense>
  )
}
