import { describe, expect, it } from 'vitest'
import { AIMessage, AIMessageChunk, HumanMessage } from '@langchain/core/messages'
import { extractMessageText, messageRequestsTools, toAIMessage } from '@/lib/agent/messages'

describe('agent messages', () => {
  it('extractMessageText from string', () => {
    expect(extractMessageText('hello')).toBe('hello')
  })

  it('extractMessageText from blocks', () => {
    expect(extractMessageText([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('ab')
  })

  it('messageRequestsTools for AIMessage with tool_calls', () => {
    const msg = new AIMessage({
      content: '',
      tool_calls: [{ name: 'find_client', args: {}, id: '1', type: 'tool_call' }],
    })
    expect(messageRequestsTools(msg)).toBe(true)
  })

  it('messageRequestsTools for AIMessageChunk', () => {
    const chunk = new AIMessageChunk({
      content: '',
      tool_calls: [{ name: 'find_client', args: {}, id: '1', type: 'tool_call' }],
    })
    expect(messageRequestsTools(chunk)).toBe(true)
  })

  it('messageRequestsTools false for human', () => {
    expect(messageRequestsTools(new HumanMessage('hi'))).toBe(false)
  })

  it('toAIMessage normalizes chunk', () => {
    const chunk = new AIMessageChunk({ content: 'ok' })
    expect(toAIMessage(chunk).content).toBe('ok')
  })
})
