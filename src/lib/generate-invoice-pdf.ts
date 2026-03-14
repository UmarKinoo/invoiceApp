import React from 'react'
import { getPayloadClient } from '@/lib/payload-server'
import { getUser } from '@/lib/auth'
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

/** Generate invoice PDF buffer and filename for download or email attachment. */
export async function generateInvoicePdfBuffer(
  invoiceId: number
): Promise<{ buffer: Buffer; filename: string } | null> {
  const payload = await getPayloadClient()
  let invoice: Awaited<
    ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>
  > | null = null
  try {
    invoice = await payload.findByID({
      collection: 'invoices',
      id: invoiceId,
      depth: 1,
    })
  } catch {
    return null
  }
  if (!invoice) return null

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

  const settings = (await payload.findGlobal({
    slug: 'settings',
    depth: 1,
  })) as unknown as Record<string, unknown> | null
  const currency = (settings?.currency as string) ?? 'MUR'
  const logoObj = settings?.logo as { url?: string } | number | null | undefined
  const logoWhiteObj = settings?.logoWhite as
    | { url?: string }
    | number
    | null
    | undefined
  const mainLogoUrl =
    (logoObj &&
      typeof logoObj === 'object' &&
      logoObj !== null &&
      'url' in logoObj &&
      logoObj.url) ||
    (settings?.logoUrl as string) ||
    null
  const logoWhiteUrl =
    logoWhiteObj &&
    typeof logoWhiteObj === 'object' &&
    logoWhiteObj !== null &&
    'url' in logoWhiteObj
      ? logoWhiteObj.url
      : null
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  let logoUrl: string | null = logoWhiteUrl || mainLogoUrl
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('/')) {
    logoUrl = appBaseUrl + logoUrl
  }
  const business = settings
    ? {
        businessName: (settings.businessName as string) ?? '',
        businessAddress: (settings.businessAddress as string) ?? '',
        businessEmail: (settings.businessEmail as string) ?? '',
        businessPhone: (settings.businessPhone as string) ?? '',
        businessBrn: (settings.businessBrn as string) ?? '',
        vatRegistrationNumber: (settings.vatRegistrationNumber as string) ?? '',
      }
    : null

  const invoiceData = {
    invoiceNumber: inv.invoiceNumber ?? null,
    date: inv.date ?? null,
    dueDate: inv.dueDate ?? null,
    status: inv.status ?? null,
    total: Number(inv.total),
    subtotal,
    tax: Number(inv.tax),
    discount: Number(inv.discount) ?? 0,
    shipping: Number(inv.shipping) ?? 0,
    carNumber: inv.carNumber ?? null,
    notes: inv.notes ?? null,
    items,
  }

  const user = await getUser()
  const deliveredBy = user?.email ?? null

  const doc = React.createElement(InvoicePdfDocument, {
    invoice: invoiceData,
    client: clientData,
    currency,
    business,
    logoUrl,
    deliveredBy,
    appBaseUrl,
  })
  const pdfStream = await ReactPDF.renderToStream(
    doc as React.ReactElement<React.ComponentProps<typeof Document>>
  )
  const buffer = await streamToBuffer(pdfStream)
  const filename = `invoice-${inv.invoiceNumber ?? invoiceId}.pdf`.replace(
    /[^a-zA-Z0-9._-]/g,
    '-'
  )
  return { buffer, filename }
}
