import { describe, expect, it } from 'vitest'
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { mapCheckpointMessages } from '@/lib/agent/history-map'

describe('mapCheckpointMessages', () => {
  it('maps user, assistant, and draft link from tool output', () => {
    const raw = [
      new HumanMessage('Find Acme'),
      new AIMessage('Found them.'),
      new ToolMessage({
        content: JSON.stringify({
          ok: true,
          id: 5,
          invoiceNumber: 'INV-1005',
          reviewUrl: 'http://localhost:3000/dashboard/invoices/5',
        }),
        tool_call_id: 'x',
        name: 'create_invoice',
      }),
    ]
    expect(mapCheckpointMessages(raw)).toEqual([
      { role: 'user', content: 'Find Acme' },
      { role: 'assistant', content: 'Found them.' },
      {
        role: 'draft_link',
        url: 'http://localhost:3000/dashboard/invoices/5',
        invoiceId: 5,
        invoiceNumber: 'INV-1005',
      },
    ])
  })

  it('skips empty human content', () => {
    expect(mapCheckpointMessages([new HumanMessage('')])).toEqual([])
  })
})
