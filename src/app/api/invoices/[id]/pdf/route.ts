import { NextResponse } from 'next/server'
import { generateInvoicePdfBuffer } from '@/lib/generate-invoice-pdf'

export async function GET(
  req: Request,
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
  const { searchParams } = new URL(req.url)
  const isInline = searchParams.get('inline') === '1'
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
