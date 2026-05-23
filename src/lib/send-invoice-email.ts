import type { Payload } from 'payload'
import { getAppBaseUrl } from '@/lib/agent/urls'
import { createActivityLog } from '@/collections/hooks/createActivityLog'
import { sendEmail, invoiceEmailTemplate } from '@/lib/email'
import { generateInvoicePdfBuffer } from '@/lib/generate-invoice-pdf'
import { getPayloadClient } from '@/lib/payload-server'
import type { Invoice } from '@/payload-types'

export type SendInvoiceEmailInput = {
  invoiceId: number
  to: string
  subject?: string
  messageBody?: string
  /** Passed to Payload update / activity log when available */
  userId?: number
  payload?: Payload
}

export type SendInvoiceEmailResult =
  | {
      ok: true
      to: string
      subject: string
      invoiceNumber: string
      invoiceId: number
    }
  | { ok: false; error: string }

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult> {
  const to = input.to.trim()
  if (!to) {
    return { ok: false, error: 'Recipient email is required.' }
  }

  const payload = input.payload ?? (await getPayloadClient())
  const invoiceId = input.invoiceId
  const appBaseUrl = getAppBaseUrl()

  let invoice: Invoice | null = null
  try {
    invoice = (await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 1,
    })) as Invoice
  } catch {
    invoice = null
  }

  if (!invoice) {
    return { ok: false, error: `Invoice ${invoiceId} not found.` }
  }

  const subject = input.subject?.trim() || `Invoice ${invoice.invoiceNumber ?? invoiceId}`
  const messageBody = input.messageBody?.trim() || ''

  const pdfResult = await generateInvoicePdfBuffer(invoiceId)
  const attachments: {
    filename: string
    content?: Buffer
    path?: string
    contentId?: string
  }[] = pdfResult ? [{ filename: pdfResult.filename, content: pdfResult.buffer }] : []

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
    /* optional */
  }

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
    /* optional */
  }

  const downloadUrl = `${appBaseUrl}/api/invoices/${invoiceId}/pdf`
  const html = invoiceEmailTemplate({
    invoiceNumber: String(invoice.invoiceNumber ?? invoiceId),
    downloadUrl,
    messageBody: messageBody || undefined,
    businessLogoUrl,
    swiftbookLogoUrl: logoUrl,
    swiftbookLogoCid: logoCid,
  })

  const result = await sendEmail({
    to,
    subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  if (!result.success) {
    const detail =
      result.error instanceof Error
        ? result.error.message
        : typeof result.error === 'string'
          ? result.error
          : 'Email service failed'
    return {
      ok: false,
      error: `Failed to send email. ${detail}`.trim(),
    }
  }

  try {
    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: { status: 'sent' },
      ...(input.userId
        ? { user: { id: input.userId, collection: 'users' } as never }
        : {}),
    })
  } catch {
    /* sent; status update best-effort */
  }

  const clientId =
    typeof invoice.client === 'object' && invoice.client?.id
      ? invoice.client.id
      : typeof invoice.client === 'number'
        ? invoice.client
        : null

  if (clientId) {
    await createActivityLog({
      payload,
      userId: input.userId,
      clientId,
      type: 'email_sent',
      body: `Invoice ${invoice.invoiceNumber ?? ''} sent to ${to}`,
      relatedCollection: 'invoices',
      relatedId: invoiceId,
      meta: {
        subject,
        to,
        invoiceNumber: invoice.invoiceNumber,
      },
    })
  }

  return {
    ok: true,
    to,
    subject,
    invoiceNumber: String(invoice.invoiceNumber ?? invoiceId),
    invoiceId,
  }
}
