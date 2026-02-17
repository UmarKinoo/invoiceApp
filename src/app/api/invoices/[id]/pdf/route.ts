import React from 'react'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'
import ReactPDF, { Document } from '@react-pdf/renderer'
import { InvoicePdfDocument } from '@/lib/invoice-pdf-document'
import type { Invoice } from '@/payload-types'

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await getPayloadClient()
  let invoice: Awaited<
    ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>
  > | null = null
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
  const client =
    typeof inv.client === 'object' && inv.client ? inv.client : null
  const clientData = client
    ? {
        name: client.name ?? null,
        company: client.company ?? null,
        email: 'email' in client ? client.email ?? null : null,
      }
    : null

  const items = inv.items ?? []
  const subtotal = items.reduce(
    (acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0),
    0
  )

  const settings = await payload.findGlobal({ slug: 'settings' })
  const currency = settings?.currency ?? 'MUR'

  const invoiceData = {
    invoiceNumber: inv.invoiceNumber ?? null,
    date: inv.date ?? null,
    dueDate: inv.dueDate ?? null,
    status: inv.status ?? null,
    total: Number(inv.total),
    subtotal,
    tax: Number(inv.tax),
    notes: inv.notes ?? null,
    items,
  }

  try {
    const doc = React.createElement(InvoicePdfDocument, {
      invoice: invoiceData,
      client: clientData,
      currency,
    })
    const pdfStream = await ReactPDF.renderToStream(
      doc as React.ReactElement<React.ComponentProps<typeof Document>>
    )
    const buffer = await streamToBuffer(pdfStream)
    const filename = `invoice-${inv.invoiceNumber ?? id}.pdf`.replace(
      /[^a-zA-Z0-9._-]/g,
      '-'
    )
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[PDF] Failed to generate PDF:', err)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
