import { invoiceReviewUrl } from '@/lib/agent/urls'
import { activityIdForTool, publishActivity, THINKING_ACTIVITY_ID } from '@/lib/agent/emit-activity'
import { labelForTool } from '@/lib/agent/activity'

export type E2eMockScenario = 'activities' | 'interrupt' | 'draft' | 'error'

function encode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export function parseE2eScenario(
  lastUserMessage: string,
  explicit?: string,
): E2eMockScenario | null {
  if (explicit === 'activities' || explicit === 'interrupt' || explicit === 'draft' || explicit === 'error') {
    return explicit
  }
  const m = lastUserMessage.match(/\[mock:(activities|interrupt|draft|error)\]/i)
  return m ? (m[1].toLowerCase() as E2eMockScenario) : null
}

export function isSlowActivitiesMock(message: string): boolean {
  return /\[mock:activities\]\s*slow/i.test(message)
}

/** Deterministic SSE stream for E2E / integration tests (no OpenAI). */
export function createMockAgentStream(
  threadId: string,
  scenario: E2eMockScenario,
  options?: { slow?: boolean },
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const run = () => {
      const enqueue = (event: Record<string, unknown>) => controller.enqueue(encode(event))

      try {
        enqueue({ type: 'session', threadId })
        publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
          label: 'Thinking',
          status: 'running',
        })

        if (scenario === 'error') {
          publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
            status: 'error',
            detail: 'Mock failure',
          })
          enqueue({ type: 'error', error: 'Mock agent error (AGENT_E2E_MOCK)' })
          enqueue({ type: 'done' })
          controller.close()
          return
        }

        const findId = activityIdForTool('find_client')
        publishActivity(controller, encode, threadId, findId, {
          label: labelForTool('find_client'),
          status: 'running',
          tool: 'find_client',
        })
        publishActivity(controller, encode, threadId, findId, {
          status: 'completed',
          detail: '{"matches":[]}',
        })
        enqueue({ type: 'tool_call', name: 'find_client', args: { query: 'test' } })
        enqueue({ type: 'tool_result', name: 'find_client', output: '{"matches":[]}' })

        if (scenario === 'activities') {
          publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
            status: 'completed',
          })
          enqueue({ type: 'final', content: 'Mock activity stream complete.' })
          enqueue({ type: 'done' })
          controller.close()
          return
        }

        if (scenario === 'interrupt') {
          const question = 'Create draft invoice for Test Co totaling $240? Reply yes to confirm.'
          publishActivity(controller, encode, threadId, 'ask-human', {
            label: labelForTool('ask_human'),
            status: 'running',
            tool: 'ask_human',
            detail: question.slice(0, 120),
          })
          enqueue({ type: 'interrupt', question })
          enqueue({ type: 'done' })
          controller.close()
          return
        }

        if (scenario === 'draft') {
          const invoiceId = 99901
          const invoiceNumber = 'INV-MOCK-99901'
          const reviewUrl = invoiceReviewUrl(invoiceId)
          const createId = activityIdForTool('create_invoice')
          publishActivity(controller, encode, threadId, createId, {
            label: labelForTool('create_invoice'),
            status: 'running',
            tool: 'create_invoice',
          })
          const output = JSON.stringify({
            ok: true,
            id: invoiceId,
            invoiceNumber,
            total: 240,
            status: 'draft',
            reviewUrl,
          })
          publishActivity(controller, encode, threadId, createId, {
            status: 'completed',
            detail: output.slice(0, 120),
          })
          enqueue({ type: 'tool_result', name: 'create_invoice', output })
          enqueue({
            type: 'draft_link',
            url: reviewUrl,
            invoiceId,
            invoiceNumber,
          })
          enqueue({
            type: 'final',
            content: `Draft ${invoiceNumber} created. [Review draft ${invoiceNumber}](${reviewUrl})`,
          })
          publishActivity(controller, encode, threadId, THINKING_ACTIVITY_ID, {
            status: 'completed',
          })
          enqueue({ type: 'done' })
          controller.close()
        }
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error(String(err)))
      }
      }

      if (options?.slow) {
        setTimeout(run, 2500)
      } else {
        run()
      }
    },
  })
}

export function mockStreamResponseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}
