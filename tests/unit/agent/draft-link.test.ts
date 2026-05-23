import { describe, expect, it } from 'vitest'
import { draftLinkFromCreateInvoiceOutput } from '@/lib/agent/draft-link'

describe('draftLinkFromCreateInvoiceOutput', () => {
  it('returns null for other tools', () => {
    expect(draftLinkFromCreateInvoiceOutput('find_client', '{"matches":[]}')).toBeNull()
  })

  it('parses successful create_invoice', () => {
    const draft = draftLinkFromCreateInvoiceOutput(
      'create_invoice',
      JSON.stringify({
        ok: true,
        id: 42,
        invoiceNumber: 'INV-1042',
        reviewUrl: 'http://localhost:3000/dashboard/invoices/42',
      }),
    )
    expect(draft).toEqual({
      invoiceId: 42,
      invoiceNumber: 'INV-1042',
      reviewUrl: 'http://localhost:3000/dashboard/invoices/42',
    })
  })

  it('returns null when create failed', () => {
    expect(
      draftLinkFromCreateInvoiceOutput(
        'create_invoice',
        JSON.stringify({ ok: false, error: 'bad client' }),
      ),
    ).toBeNull()
  })
})
