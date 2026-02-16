/**
 * One-time CSV import: contacts → clients, invoices → invoices.
 * Run: npx tsx src/scripts/import-csv.ts
 *
 * Expects CSV files in project root:
 * - exported-Contacts-16-02-2026_10-10-pm.csv
 * - exported-Invoices-16-02-2026_10-08-pm.csv
 *
 * Loads .env from project root so PAYLOAD_SECRET and DATABASE_URI are set.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

// Load .env before Payload init (tsx does not load .env automatically)
const envPath = path.join(ROOT, '.env')
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) {
      const value = match[2]!.replace(/^["']|["']$/g, '').trim()
      process.env[match[1]!] = value
    }
  }
}

const CONTACTS_CSV = path.join(ROOT, 'exported-Contacts-16-02-2026_10-10-pm.csv')
const INVOICES_CSV = path.join(ROOT, 'exported-Invoices-16-02-2026_10-08-pm.csv')

/** Parse a single CSV line respecting quoted fields (handles commas inside quotes). */
function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1
      let field = ''
      while (i < line.length && line[i] !== '"') {
        field += line[i]
        i += 1
      }
      if (line[i] === '"') i += 1
      out.push(field.trim())
      if (line[i] === ',') i += 1
      continue
    }
    let field = ''
    while (i < line.length && line[i] !== ',') {
      field += line[i]
      i += 1
    }
    out.push(field.trim())
    if (line[i] === ',') i += 1
  }
  return out
}

function loadCSV(filePath: string): { headers: string[]; rows: string[][] } {
  const raw = readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) throw new Error(`Empty CSV: ${filePath}`)
  const headers = parseCSVLine(lines[0]!)
  const rows = lines.slice(1).map(parseCSVLine)
  return { headers, rows }
}

function headerIndex(headers: string[], name: string): number {
  const i = headers.indexOf(name)
  if (i === -1) throw new Error(`Missing column: ${name}`)
  return i
}

function get(row: string[], i: number): string {
  const v = row[i]
  return v != null ? String(v).trim() : ''
}

function parseDate(str: string): string | null {
  if (!str) return null
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

async function main() {
  const { getPayloadClient } = await import('@/lib/payload-server')
  const payload = await getPayloadClient()

  // 1) Unknown client for invoices without Contact ID
  const unknownEmail = 'unknown@imported.local'
  let unknownClientId: number
  const existingUnknown = await payload.find({
    collection: 'clients',
    where: { email: { equals: unknownEmail } },
    limit: 1,
  })
  if (existingUnknown.docs.length > 0) {
    unknownClientId = existingUnknown.docs[0]!.id as number
    console.log('Using existing "Unknown" client id:', unknownClientId)
  } else {
    const created = await payload.create({
      collection: 'clients',
      data: {
        name: 'Unknown',
        email: unknownEmail,
        company: 'Unknown',
      },
    })
    unknownClientId = created.id as number
    console.log('Created "Unknown" client id:', unknownClientId)
  }

  // 2) Load contacts CSV and build column indices
  const { headers: contactHeaders, rows: contactRows } = loadCSV(CONTACTS_CSV)
  const cId = headerIndex(contactHeaders, 'id')
  const cEmail = headerIndex(contactHeaders, 'Email')
  const cPrefix = headerIndex(contactHeaders, 'Prefix')
  const cFirst = headerIndex(contactHeaders, 'First Name')
  const cLast = headerIndex(contactHeaders, 'Last Name')
  const cAddr1 = headerIndex(contactHeaders, 'Address Line 1 (Main Address)')
  const cCity = headerIndex(contactHeaders, 'City (Main Address)')
  const cHome = headerIndex(contactHeaders, 'Home Telephone')
  const cWork = headerIndex(contactHeaders, 'Work Telephone')
  const cMobile = headerIndex(contactHeaders, 'Mobile Telephone')

  const contactIdToPayloadId = new Map<number, number>()
  contactIdToPayloadId.set(0, unknownClientId) // no contact → Unknown

  for (const row of contactRows) {
    const csvId = parseInt(get(row, cId), 10)
    if (Number.isNaN(csvId)) continue

    const email = get(row, cEmail) || `contact-${csvId}@imported.local`
    const prefix = get(row, cPrefix)
    const first = get(row, cFirst)
    const last = get(row, cLast)
    const name = [prefix, first, last].filter(Boolean).join(' ').trim() || `Contact ${csvId}`
    const company = name
    const phone = get(row, cMobile) || get(row, cWork) || get(row, cHome)
    const addr1 = get(row, cAddr1)
    const city = get(row, cCity)
    const address = [addr1, city].filter(Boolean).join(', ').trim()

    const existing = await payload.find({
      collection: 'clients',
      where: { email: { equals: email } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      contactIdToPayloadId.set(csvId, existing.docs[0]!.id as number)
      continue
    }

    const doc = await payload.create({
      collection: 'clients',
      data: { name, company, email, phone, address },
    })
    contactIdToPayloadId.set(csvId, doc.id as number)
  }
  console.log('Contacts imported. Map size:', contactIdToPayloadId.size)

  // 3) Load invoices CSV
  const { headers: invHeaders, rows: invRows } = loadCSV(INVOICES_CSV)
  const iRef = headerIndex(invHeaders, 'Reference')
  const iStatus = headerIndex(invHeaders, 'Status')
  const iDate = headerIndex(invHeaders, 'date')
  const iDue = headerIndex(invHeaders, 'due_date')
  const iNet = headerIndex(invHeaders, 'net')
  const iTax = headerIndex(invHeaders, 'tax')
  const iTotal = headerIndex(invHeaders, 'total')
  const iDiscount = headerIndex(invHeaders, 'discount')
  const iShipping = headerIndex(invHeaders, 'shipping')
  const iCar = headerIndex(invHeaders, 'Car Number')
  const iContactId = headerIndex(invHeaders, 'Contact ID')

  let created = 0
  let skipped = 0
  for (const row of invRows) {
    const invoiceNumber = get(row, iRef)
    if (!invoiceNumber) continue

    const existingInv = await payload.find({
      collection: 'invoices',
      where: { invoiceNumber: { equals: invoiceNumber } },
      limit: 1,
    })
    if (existingInv.docs.length > 0) {
      skipped += 1
      continue
    }

    const contactIdRaw = get(row, iContactId)
    const contactId = contactIdRaw ? parseInt(contactIdRaw, 10) : 0
    const clientId = contactIdToPayloadId.get(Number.isNaN(contactId) ? 0 : contactId) ?? unknownClientId

    const statusStr = get(row, iStatus).toLowerCase()
    const status =
      statusStr === 'paid' ? 'paid' : statusStr === 'unpaid' ? 'overdue' : 'draft'

    const dateStr = parseDate(get(row, iDate))
    const dueStr = parseDate(get(row, iDue))
    if (!dateStr || !dueStr) {
      console.warn('Skipping invoice', invoiceNumber, '- invalid date/due_date')
      skipped += 1
      continue
    }

    const net = parseFloat(get(row, iNet)) || 0
    const tax = parseFloat(get(row, iTax)) || 0
    const total = parseFloat(get(row, iTotal)) || 0
    const discount = parseFloat(get(row, iDiscount)) || 0
    const shipping = parseFloat(get(row, iShipping)) || 0
    const notes = get(row, iCar)

    await payload.create({
      collection: 'invoices',
      data: {
        invoiceNumber,
        client: clientId,
        date: dateStr,
        dueDate: dueStr,
        status,
        items: [{ description: 'Services', quantity: 1, rate: net }],
        subtotal: net,
        tax,
        total,
        discount,
        shipping,
        notes: notes || undefined,
      },
    })
    created += 1
  }

  console.log('Invoices: created', created, ', skipped (duplicate/invalid)', skipped)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
