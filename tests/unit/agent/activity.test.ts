import { describe, expect, it } from 'vitest'
import { labelForTool, labelForStatus } from '@/lib/agent/activity'

describe('activity labels', () => {
  it('labels known tools', () => {
    expect(labelForTool('find_client')).toBe('Looking up client')
    expect(labelForTool('create_invoice')).toBe('Creating invoice')
  })

  it('labelForStatus maps status messages', () => {
    expect(labelForStatus('Calling model…')).toBe('Thinking')
    expect(labelForStatus('Running tools…')).toBe('Running tools')
  })
})
