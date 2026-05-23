import { NextResponse } from 'next/server'
import { sendInvoiceEmail } from '@/lib/send-invoice-email'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const result = await sendInvoiceEmail({
    invoiceId,
    to,
    subject: body.subject,
    messageBody: body.body,
  })

  if (!result.ok) {
    const status = result.error.includes('not found') ? 404 : 502
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true })
}
