import type { BaseMessage } from '@langchain/core/messages'
import { getCompiledGraph } from '@/lib/agent/graph'
import {
  mapCheckpointMessages,
  type AgentHistoryMessage,
} from '@/lib/agent/history-map'

export type { AgentHistoryMessage } from '@/lib/agent/history-map'
export { mapCheckpointMessages } from '@/lib/agent/history-map'

export type ThreadHistory = {
  messages: AgentHistoryMessage[]
  pendingInterrupt: string | null
}

/** Load display messages from LangGraph checkpoint for a thread. */
export async function getThreadHistory(threadId: string): Promise<ThreadHistory> {
  const graph = await getCompiledGraph()
  const state = await graph.getState({
    configurable: { thread_id: threadId },
  })

  const raw = (state.values as { messages?: BaseMessage[] })?.messages ?? []
  const pending = state.tasks?.[0]?.interrupts?.[0]
  const pendingInterrupt =
    pending != null
      ? typeof pending.value === 'string'
        ? pending.value
        : JSON.stringify(pending.value)
      : null

  const messages = mapCheckpointMessages(raw)
  if (pendingInterrupt) {
    messages.push({ role: 'interrupt', question: pendingInterrupt })
  }

  return { messages, pendingInterrupt }
}
