import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages'
import { draftLinkFromCreateInvoiceOutput } from '@/lib/agent/draft-link'
import { extractMessageText } from '@/lib/agent/messages'

export type AgentHistoryMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'interrupt'; question: string }
  | {
      role: 'draft_link'
      url: string
      invoiceId: number
      invoiceNumber: string
    }

/** Map LangGraph checkpoint messages to UI history (pure, testable). */
export function mapCheckpointMessages(raw: BaseMessage[]): AgentHistoryMessage[] {
  const out: AgentHistoryMessage[] = []

  for (const m of raw) {
    if (HumanMessage.isInstance(m)) {
      const content = extractMessageText(m.content as never)
      if (content.trim()) out.push({ role: 'user', content })
      continue
    }
    if (AIMessage.isInstance(m)) {
      const content = extractMessageText(m.content)
      if (content.trim()) out.push({ role: 'assistant', content })
      continue
    }
    if (ToolMessage.isInstance(m)) {
      const name = m.name ?? ''
      const output = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      const draft = draftLinkFromCreateInvoiceOutput(name, output)
      if (draft) {
        out.push({
          role: 'draft_link',
          url: draft.reviewUrl,
          invoiceId: draft.invoiceId,
          invoiceNumber: draft.invoiceNumber,
        })
      }
    }
  }

  return out
}
