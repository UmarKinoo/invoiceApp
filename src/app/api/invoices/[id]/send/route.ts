import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'
import { sendEmail } from '@/lib/email'
import { createActivityLog } from '@/collections/hooks/createActivityLog'
import type { Invoice } from '@/payload-types'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
      id: Number(id),
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
  const textBody = body.body?.trim() || `Please find your invoice ${inv.invoiceNumber ?? ''} attached or linked. Thank you.`
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>${textBody.replace(/\n/g, '<br>')}</p>
        <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
          You can view and download the invoice from your dashboard or contact us for a PDF.
        </p>
      </body>
    </html>
  `

  const result = await sendEmail({ to, subject, html })
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
