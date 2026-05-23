import { describe, expect, it } from 'vitest'
import {
  createMockAgentStream,
  parseE2eScenario,
} from '@/lib/agent/e2e-mock-stream'
import { readSseEvents, eventTypes } from '../../helpers/parse-sse'

describe('e2e mock stream', () => {
  it('parseE2eScenario from tag and explicit', () => {
    expect(parseE2eScenario('hello [mock:draft]')).toBe('draft')
    expect(parseE2eScenario('x', 'error')).toBe('error')
    expect(parseE2eScenario('plain')).toBeNull()
  })

  it('draft scenario emits session, activity, draft_link, final, done', async () => {
    const events = await readSseEvents(createMockAgentStream('99', 'draft'))
    const types = eventTypes(events)
    expect(types).toContain('session')
    expect(types).toContain('activity')
    expect(types).toContain('draft_link')
    expect(types).toContain('final')
    expect(types).toContain('done')
    const draft = events.find((e) => e.type === 'draft_link')
    expect(draft).toMatchObject({ invoiceNumber: 'INV-MOCK-99901' })
  })

  it('interrupt scenario emits interrupt', async () => {
    const events = await readSseEvents(createMockAgentStream('1', 'interrupt'))
    expect(eventTypes(events)).toContain('interrupt')
  })

  it('error scenario emits error', async () => {
    const events = await readSseEvents(createMockAgentStream('1', 'error'))
    expect(eventTypes(events)).toContain('error')
  })
})
