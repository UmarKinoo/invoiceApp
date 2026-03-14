import { NextResponse } from 'next/server'
import { generateInvoicePdfBuffer } from '@/lib/generate-invoice-pdf'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoiceId = Number(id)
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const result = await generateInvoicePdfBuffer(invoiceId)
  if (!result) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { buffer, filename } = result
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
