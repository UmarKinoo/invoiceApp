import { afterEach, describe, expect, it } from 'vitest'
import { getAppBaseUrl, invoiceReviewPath, invoiceReviewUrl } from '@/lib/agent/urls'

describe('agent urls', () => {
  const env = { ...process.env }

  afterEach(() => {
    process.env = { ...env }
  })

  it('builds review path', () => {
    expect(invoiceReviewPath(7)).toBe('/dashboard/invoices/7')
  })

  it('uses NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    delete process.env.APP_URL
    delete process.env.VERCEL_URL
    expect(invoiceReviewUrl(3)).toBe('https://app.example.com/dashboard/invoices/3')
  })

  it('strips trailing slash from base', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/'
    expect(getAppBaseUrl()).toBe('https://app.example.com')
  })
})
