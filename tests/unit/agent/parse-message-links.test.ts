import { describe, expect, it } from 'vitest'
import { isInternalAppHref, parseMessageSegments, toInternalPath } from '@/lib/agent/parse-message-links'

describe('parseMessageSegments', () => {
  it('parses markdown links without showing raw url in label', () => {
    const segments = parseMessageSegments(
      'Done. [Review draft INV-1042](http://localhost:3000/dashboard/invoices/42)',
    )
    expect(segments).toEqual([
      { type: 'text', value: 'Done. ' },
      {
        type: 'link',
        label: 'Review draft INV-1042',
        href: 'http://localhost:3000/dashboard/invoices/42',
      },
    ])
  })

  it('parses bare dashboard urls with generated label', () => {
    const segments = parseMessageSegments(
      'Open http://localhost:3000/dashboard/invoices/7 when ready.',
    )
    expect(segments.some((s) => s.type === 'link' && s.label.includes('invoice'))).toBe(true)
  })

  it('returns plain text when no links', () => {
    expect(parseMessageSegments('Hello world')).toEqual([{ type: 'text', value: 'Hello world' }])
  })
})

describe('isInternalAppHref', () => {
  it('treats same-origin dashboard paths as internal', () => {
    expect(isInternalAppHref('/dashboard/invoices/1')).toBe(true)
    expect(isInternalAppHref('http://localhost:3000/dashboard/invoices/1')).toBe(true)
  })

  it('treats external hosts as external', () => {
    expect(isInternalAppHref('https://example.com/foo')).toBe(false)
  })
})

describe('toInternalPath', () => {
  it('strips origin from absolute app urls', () => {
    expect(toInternalPath('http://localhost:3000/dashboard/invoices/3')).toBe('/dashboard/invoices/3')
  })
})
