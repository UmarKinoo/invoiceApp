/** Base URL for links shared by the agent (emails, chat review links). */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export function invoiceReviewPath(invoiceId: number): string {
  return `/dashboard/invoices/${invoiceId}`
}

export function invoiceReviewUrl(invoiceId: number): string {
  return `${getAppBaseUrl()}${invoiceReviewPath(invoiceId)}`
}
