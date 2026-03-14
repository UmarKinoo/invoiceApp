import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'
import { sendEmail, invoiceEmailTemplate } from '@/lib/email'
import { generateInvoicePdfBuffer } from '@/lib/generate-invoice-pdf'
import { createActivityLog } from '@/collections/hooks/createActivityLog'
import type { Invoice } from '@/payload-types'

const appBaseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000'
).replace(/\/$/, '')

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoiceId = Number(id)
  let body: { to?: string; subject?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const to = body.to?.trim()
  if (!to) {
    return NextResponse.json({ error: 'Missing "to" email' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  let invoice: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>> | null = null
  try {
    invoice = await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 1,
    })
  } catch {
    invoice = null
  }
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const inv = invoice as Invoice
  const subject = body.subject?.trim() || `Invoice ${inv.invoiceNumber ?? ''}`
  const messageBody = body.body?.trim() || ''

  // Generate PDF and attach to email
  const pdfResult = await generateInvoicePdfBuffer(invoiceId)
  const attachments: { filename: string; content?: Buffer; path?: string; contentId?: string }[] = pdfResult
    ? [{ filename: pdfResult.filename, content: pdfResult.buffer }]
    : []

  // Inline logo: fetch and embed as content so Resend accepts it (path-only inline can fail)
  const logoUrl = `${appBaseUrl}/swiftbook-icon.png`
  let logoCid: string | undefined
  try {
    const logoRes = await fetch(logoUrl)
    if (logoRes.ok) {
      const logoBuffer = Buffer.from(await logoRes.arrayBuffer())
      attachments.push({
        filename: 'swiftbook-icon.png',
        content: logoBuffer,
        contentId: 'swiftbook-logo',
      })
      logoCid = 'swiftbook-logo'
    }
  } catch {
    // Logo optional; template falls back to logoUrl
  }

  // Business logo for dark background (header): use main logo from settings
  let businessLogoUrl: string | null = null
  try {
    const settings = (await payload.findGlobal({
      slug: 'settings',
      depth: 1,
    })) as unknown as Record<string, unknown> | null
    if (settings) {
      const logoObj = settings.logo as { url?: string } | number | null | undefined
      const url =
        logoObj && typeof logoObj === 'object' && logoObj !== null && 'url' in logoObj
          ? (logoObj.url as string)
          : (settings.logoUrl as string) || null
      if (url) {
        businessLogoUrl = url.startsWith('/') ? `${appBaseUrl}${url}` : url
      }
    }
  } catch {
    // optional
  }

  const downloadUrl = `${appBaseUrl}/api/invoices/${id}/pdf`
  const html = invoiceEmailTemplate({
    invoiceNumber: String(inv.invoiceNumber ?? id),
    downloadUrl,
    messageBody: messageBody || undefined,
    businessLogoUrl,
    swiftbookLogoUrl: `${appBaseUrl}/swiftbook-icon.png`,
    swiftbookLogoCid: logoCid,
  })

  const result = await sendEmail({
    to,
    subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  })
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to send email', details: result.error },
      { status: 502 }
    )
  }

  try {
    await payload.update({
      collection: 'invoices',
      id: Number(id),
      data: { status: 'sent' },
    })
  } catch {
    // Email was sent; status update is best-effort
  }

  const clientId =
    typeof inv.client === 'object' && inv.client?.id
      ? inv.client.id
      : typeof inv.client === 'number'
        ? inv.client
        : null
  if (clientId) {
    await createActivityLog({
      payload,
      userId: undefined,
      clientId,
      type: 'email_sent',
      body: `Invoice ${inv.invoiceNumber ?? ''} sent to ${to}`,
      relatedCollection: 'invoices',
      relatedId: Number(id),
      meta: {
        subject,
        to,
        invoiceNumber: inv.invoiceNumber,
      },
    })
  }

  return NextResponse.json({ success: true })
}
