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

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'clients', limit: 5000, depth: 0 })
    const docs = res.docs ?? []

    const headers = ['Name', 'Company', 'Email', 'Phone', 'Address']
    const rows = docs.map((c) => [
      escapeCsvCell(c.name),
      escapeCsvCell(c.company),
      escapeCsvCell(c.email),
      escapeCsvCell(c.phone),
      escapeCsvCell((c.address ?? '').replace(/\n/g, ' ')),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' })

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    console.error('Export clients error:', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
