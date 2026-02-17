import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload-server'

export const dynamic = 'force-dynamic'

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatDateForCsv(value: string | Date | null | undefined): string {
  if (value == null) return ''
  const s = typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : String(value)
  return s.slice(0, 10)
}

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'invoices', limit: 5000, depth: 1 })
    const docs = res.docs ?? []

    const headers = ['Invoice Number', 'Client', 'Date', 'Due Date', 'Status', 'Total']
    const rows = docs.map((inv) => {
      const client = typeof inv.client === 'object' && inv.client && 'name' in inv.client ? inv.client.name : '—'
      return [
        escapeCsvCell(inv.invoiceNumber),
        escapeCsvCell(client),
        escapeCsvCell(formatDateForCsv(inv.date)),
        escapeCsvCell(formatDateForCsv(inv.dueDate)),
        escapeCsvCell(inv.status),
        escapeCsvCell(inv.total),
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' })

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    console.error('Export invoices error:', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
