import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload-server'
import { getCompiledGraph } from '@/lib/agent/graph'
import { loadSystemPrompt } from '@/lib/agent/prompts'
import { agentError, agentLog } from '@/lib/agent/logger'
import { extractMessageText } from '@/lib/agent/messages'
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  isAIMessageChunk,
  ToolMessage,
} from '@langchain/core/messages'
import { messageRequestsTools } from '@/lib/agent/messages'
import { labelForTool } from '@/lib/agent/activity'
import {
  activityIdForTool,
  publishActivity,
  THINKING_ACTIVITY_ID,
} from '@/lib/agent/emit-activity'
import { Command } from '@langchain/langgraph'
import { draftLinkFromCreateInvoiceOutput } from '@/lib/agent/draft-link'
import {
  createMockAgentStream,
  isSlowActivitiesMock,
  mockStreamResponseHeaders,
  parseE2eScenario,
} from '@/lib/agent/e2e-mock-stream'
import { resolveAgentThreadId } from '@/lib/agent/resolve-thread'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type IncomingMessage = { role: 'user' | 'assistant'; content: string }

type ChatPayload = {
  messages: IncomingMessage[]
  threadId?: string
  resume?: boolean
  /** Test-only when AGENT_E2E_MOCK=1 */
  e2eScenario?: 'activities' | 'interrupt' | 'draft' | 'error'
}

function encode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()

  agentLog('request.start', { requestId })

  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    agentLog('request.unauthorized', { requestId })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatPayload
  try {
    body = (await req.json()) as ChatPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  const lastUserMessage = body.messages[body.messages.length - 1]?.content?.trim() ?? ''
  if (!lastUserMessage) {
    return NextResponse.json({ error: 'Last message must be non-empty' }, { status: 400 })
  }

  agentLog('request.parsed', {
    requestId,
    userId: user.id,
    threadId: body.threadId ?? null,
    resume: Boolean(body.resume),
    messagePreview: lastUserMessage.slice(0, 120),
  })

  let threadId: string
  try {
    threadId = await resolveAgentThreadId(payload, user, body, lastUserMessage, requestId)
  } catch (err) {
    agentError('session.failed', err, { requestId })
    const message = err instanceof Error ? err.message : 'Failed to start agent session'
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message === 'Thread not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const mockScenario =
    process.env.AGENT_E2E_MOCK === '1'
      ? parseE2eScenario(lastUserMessage, body.e2eScenario) ?? 'activities'
      : null
  if (mockScenario) {
    agentLog('request.mock_stream', { requestId, threadId, mockScenario })
    const slow = mockScenario === 'activities' && isSlowActivitiesMock(lastUserMessage)
    return new Response(createMockAgentStream(threadId, mockScenario, { slow }), {
      headers: mockStreamResponseHeaders(),
    })
  }

  const [settings, graph] = await Promise.all([
    payload.findGlobal({ slug: 'settings' }),
    getCompiledGraph(),
  ])
  const systemPrompt = await loadSystemPrompt({
    userName: user.email,
    businessName: (settings?.businessName as string) ?? '',
    today: new Date().toISOString().slice(0, 10),
    currency: (settings?.currency as string) ?? 'USD',
    invoicePrefix: (settings?.invoicePrefix as string) ?? 'INV-',
    taxRateDefault: (settings?.taxRateDefault as number) ?? 0,
  })

  agentLog('graph.ready', { requestId, threadId, ms: Date.now() - startedAt })

  const runConfig = {
    configurable: {
      thread_id: threadId,
      systemPrompt,
      toolContext: { userId: user.id, userEmail: user.email },
    },
    metadata: { userId: user.id, threadId, requestId },
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encode({ type: 'session', threadId }))
      controller.enqueue(encode({ type: 'status', message: 'Starting agent…' }))

      const toolActivityIds = new Map<string, string>()
      publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
        label: 'Thinking',
        status: 'running',
      })

      const stats = {
        streamEvents: 0,
        tokenChunks: 0,
        toolCalls: 0,
        toolResults: 0,
        assistantBlocks: 0,
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input: any = body.resume
          ? new Command({ resume: lastUserMessage })
          : { messages: [new HumanMessage(lastUserMessage)] }

        agentLog('graph.stream.start', {
          requestId,
          threadId,
          resume: Boolean(body.resume),
          inputKind: body.resume ? 'Command(resume)' : 'HumanMessage',
        })

        controller.enqueue(encode({ type: 'status', message: 'Calling model…' }))
        publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
          label: 'Thinking',
          status: 'running',
        })

        const graphStream = await graph.stream(input, {
          ...runConfig,
          streamMode: ['messages', 'updates'] as const,
        })

        for await (const event of graphStream) {
          stats.streamEvents += 1
          const [mode, data] = event as [string, unknown]

          if (stats.streamEvents <= 5 || stats.streamEvents % 20 === 0) {
            agentLog('graph.stream.event', {
              requestId,
              n: stats.streamEvents,
              mode,
              dataPreview:
                mode === 'messages'
                  ? { messageType: (data as [unknown])[0]?.constructor?.name }
                  : mode === 'updates'
                    ? { nodes: Object.keys(data as object) }
                    : undefined,
            })
          }

          if (mode === 'messages') {
            const [message] = data as [AIMessageChunk, unknown]
            if (isAIMessageChunk(message) || AIMessage.isInstance(message)) {
              const text = extractMessageText(message.content)
              if (text) {
                stats.tokenChunks += 1
                publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
                  status: 'completed',
                })
                controller.enqueue(encode({ type: 'token', content: text }))
              }
              if (messageRequestsTools(message)) {
                for (const tc of message.tool_calls ?? []) {
                  stats.toolCalls += 1
                  const aid = activityIdForTool(tc.name, tc.id)
                  toolActivityIds.set(tc.name, aid)
                  publishActivity(controller, encode, threadId, aid, {
                    label: labelForTool(tc.name),
                    status: 'running',
                    tool: tc.name,
                  })
                  controller.enqueue(
                    encode({ type: 'tool_call', name: tc.name, args: tc.args ?? null }),
                  )
                }
              }
            }
          } else if (mode === 'updates') {
            const updates = data as Record<string, { messages?: unknown[] } | undefined>

            if (updates.tools) {
              controller.enqueue(encode({ type: 'status', message: 'Running tools…' }))
              publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
                label: 'Running tools',
                status: 'running',
              })
            }
            if (updates.chat) {
              controller.enqueue(encode({ type: 'status', message: 'Model thinking…' }))
              publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
                label: 'Thinking',
                status: 'running',
              })
            }

            const toolUpdate = updates.tools
            if (toolUpdate?.messages && Array.isArray(toolUpdate.messages)) {
              for (const m of toolUpdate.messages) {
                if (m instanceof ToolMessage) {
                  stats.toolResults += 1
                  const name = m.name ?? 'tool'
                  const output =
                    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                  const preview = output.slice(0, 120)
                  agentLog('tool.result', { requestId, name, preview })
                  const aid = toolActivityIds.get(name) ?? activityIdForTool(name)
                  publishActivity(controller, encode, threadId, aid, {
                    status: 'completed',
                    detail: preview,
                  })
                  controller.enqueue(
                    encode({
                      type: 'tool_result',
                      name,
                      output,
                    }),
                  )
                  const draft = draftLinkFromCreateInvoiceOutput(name, output)
                  if (draft) {
                    controller.enqueue(
                      encode({
                        type: 'draft_link',
                        url: draft.reviewUrl,
                        invoiceId: draft.invoiceId,
                        invoiceNumber: draft.invoiceNumber,
                      }),
                    )
                  }
                }
              }
            }

            const chatUpdate = updates.chat
            if (chatUpdate?.messages && Array.isArray(chatUpdate.messages)) {
              for (const m of chatUpdate.messages) {
                if (m instanceof AIMessage) {
                  const text = extractMessageText(m.content)
                  if (text) {
                    stats.assistantBlocks += 1
                    agentLog('chat.assistant_text', {
                      requestId,
                      preview: text.slice(0, 200),
                    })
                    controller.enqueue(encode({ type: 'assistant', content: text }))
                  }
                  if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
                    for (const tc of m.tool_calls) {
                      stats.toolCalls += 1
                      const aid = activityIdForTool(tc.name, tc.id)
                      toolActivityIds.set(tc.name, aid)
                      publishActivity(controller, encode, threadId, aid, {
                        label: labelForTool(tc.name),
                        status: 'running',
                        tool: tc.name,
                      })
                      agentLog('tool.call', {
                        requestId,
                        name: tc.name,
                        args: tc.args,
                      })
                      controller.enqueue(
                        encode({ type: 'tool_call', name: tc.name, args: tc.args ?? null }),
                      )
                    }
                  }
                }
              }
            }
          }
        }

        agentLog('graph.stream.end', { requestId, stats, ms: Date.now() - startedAt })

        const state = await graph.getState(runConfig)
        const pendingInterrupt = state.tasks?.[0]?.interrupts?.[0]
        const messageCount = (state.values as { messages?: unknown[] })?.messages?.length ?? 0
        const lastMessage = (state.values as { messages?: unknown[] })?.messages?.at(-1)

        agentLog('graph.state', {
          requestId,
          messageCount,
          nextNodes: state.next,
          hasInterrupt: Boolean(pendingInterrupt),
          lastMessageType: lastMessage?.constructor?.name,
        })

        if (state.next && state.next.length > 0) {
          agentLog('graph.incomplete', {
            requestId,
            nextNodes: state.next,
            hint: 'Graph stopped before tools finished; routing may have failed on a prior turn.',
          })
        }

        if (pendingInterrupt) {
          const question =
            typeof pendingInterrupt.value === 'string'
              ? pendingInterrupt.value
              : JSON.stringify(pendingInterrupt.value)
          agentLog('graph.interrupt', { requestId, questionPreview: question.slice(0, 300) })
          publishActivity(controller, encode, threadId, 'ask-human', {
            label: 'Waiting for your confirmation',
            status: 'running',
            tool: 'ask_human',
            detail: question.slice(0, 120),
          })
          controller.enqueue(encode({ type: 'interrupt', question }))
        } else if (lastMessage instanceof AIMessage) {
          const finalText = extractMessageText(lastMessage.content)
          if (finalText) {
            controller.enqueue(encode({ type: 'final', content: finalText }))
          } else if (stats.toolCalls > 0 && stats.tokenChunks === 0 && stats.assistantBlocks === 0) {
            controller.enqueue(
              encode({
                type: 'final',
                content:
                  'The agent ran tools but did not return a text reply. Check the tool steps above, or reply to continue.',
              }),
            )
          }
        } else if (stats.streamEvents === 0) {
          controller.enqueue(
            encode({
              type: 'error',
              error: 'Graph produced no stream events. Check server logs for [agent].',
            }),
          )
        }

        controller.enqueue(
          encode({
            type: 'debug',
            stats: { ...stats, elapsedMs: Date.now() - startedAt },
          }),
        )
        publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
          status: 'completed',
        })
        controller.enqueue(encode({ type: 'done' }))

        agentLog('request.done', { requestId, stats, ms: Date.now() - startedAt })
      } catch (err) {
        agentError('request.failed', err, { requestId, threadId, ms: Date.now() - startedAt })
        const message = err instanceof Error ? err.message : 'Unknown error'
        publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
          status: 'error',
          detail: message,
        })
        controller.enqueue(encode({ type: 'error', error: message }))
        controller.enqueue(encode({ type: 'done' }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
