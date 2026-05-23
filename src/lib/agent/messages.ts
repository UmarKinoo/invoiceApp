import { AIMessage, AIMessageChunk, type BaseMessage } from '@langchain/core/messages'

type TextContent = AIMessageChunk['content']

/** Pull plain text from OpenAI / LangChain message content (string or block array). */
export function extractMessageText(content: TextContent): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'text' in c && typeof c.text === 'string') return c.text
        return ''
      })
      .join('')
  }
  return ''
}

/** True when the model wants to run tools (AIMessage or AIMessageChunk from gpt-5 / streaming). */
export function messageRequestsTools(msg: BaseMessage | undefined): boolean {
  if (!msg) return false
  if (!AIMessage.isInstance(msg) && !AIMessageChunk.isInstance(msg)) return false
  if ((msg.tool_calls?.length ?? 0) > 0) return true
  if (AIMessageChunk.isInstance(msg) && (msg.tool_call_chunks?.length ?? 0) > 0) return true
  return false
}

/** Normalize invoke/stream output to AIMessage for state + routing. */
export function toAIMessage(msg: AIMessage | AIMessageChunk): AIMessage {
  if (AIMessage.isInstance(msg) && !AIMessageChunk.isInstance(msg)) {
    return msg
  }
  return new AIMessage({
    content: msg.content,
    tool_calls: msg.tool_calls,
    invalid_tool_calls: msg.invalid_tool_calls,
    usage_metadata: msg.usage_metadata,
    id: msg.id,
    additional_kwargs: msg.additional_kwargs,
    response_metadata: msg.response_metadata,
  })
}
