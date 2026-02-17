/**
 * Push local DB data to prod in one run.
 *
 * Set in .env:
 *   DATABASE_URI  = local DB (source)
 *   DB_PROD       = prod DB (target; use %23 for # in password)
 *
 * Run: pnpm run push-to-prod
 *
 * If admin login fails on prod after push, reset the user password in Payload admin or via DB.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return
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

type IdMap = Map<number, number>

function stripPayloadFields(doc: Record<string, unknown>): Record<string, unknown> {
  const out = { ...doc }
  delete out.updatedAt
  delete out.createdAt
  return out
}

async function fetchAll(payload: { find: (args: { collection: string; limit: number; page: number; depth: number }) => Promise<{ docs?: unknown[]; hasNextPage?: boolean }> }, slug: string): Promise<Record<string, unknown>[]> {
  const docs: Record<string, unknown>[] = []
  let page = 1
  const limit = 500
  while (true) {
    const res = await payload.find({ collection: slug, limit, page, depth: 0 })
    const list = (res.docs ?? []) as Record<string, unknown>[]
    docs.push(...list)
    if (!res.hasNextPage) break
    page += 1
  }
  return docs
}

async function main() {
  loadEnv()
  const localUri = process.env.DATABASE_URI
  const prodUri = process.env.DB_PROD
  if (!localUri || !prodUri) {
    console.error('Set both DATABASE_URI (local) and DB_PROD (prod) in .env')
    process.exit(1)
  }

  const { getPayload } = await import('payload')
  const configMod = await import('@payload-config')
  const { postgresAdapter } = await import('@payloadcms/db-postgres')
  const baseConfig = await (configMod.default as Promise<Record<string, unknown>>)

  const configLocal = { ...baseConfig, db: postgresAdapter({ pool: { connectionString: localUri } }) }
  const configProd = { ...baseConfig, db: postgresAdapter({ pool: { connectionString: prodUri } }) }

  // Use distinct keys so Payload caches two instances (otherwise both use 'default' and prod writes go to local)
  const payloadLocal = await getPayload({ config: configLocal, key: 'push-local' })
  const payloadProd = await getPayload({ config: configProd, key: 'push-prod' })

  const userMap: IdMap = new Map()
  const clientMap: IdMap = new Map()
  const mediaMap: IdMap = new Map()
  const invoiceMap: IdMap = new Map()
  const quoteMap: IdMap = new Map()
  const taskMap: IdMap = new Map()
  const transactionMap: IdMap = new Map()

  // 1) Users – insert via raw SQL to preserve hash/salt; skip if email already exists on prod
  const users = await fetchAll(payloadLocal, 'users')
  if (users.length > 0) {
    const { default: pg } = await import('pg')
    const prodPool = new pg.Pool({ connectionString: prodUri })
    try {
      for (const doc of users) {
        const oldId = doc.id as number
        const role = (doc.role as string) ?? 'user'
        const email = typeof doc.email === 'string' ? doc.email : String(doc.email ?? '')
        const hash = doc.hash != null ? String(doc.hash) : null
        const salt = doc.salt != null ? String(doc.salt) : null
        const emailVerified = doc.emailVerified === true

        const existing = await prodPool.query('SELECT id FROM users WHERE email = $1', [email])
        let newId: number | null = null
        if (existing.rows.length > 0) {
          newId = Number(existing.rows[0].id)
        } else {
          const res = await prodPool.query(
            `INSERT INTO users (role, email, email_verified, hash, salt, updated_at, created_at)
             VALUES ($1, $2, $3, $4, $5, now(), now())
             RETURNING id`,
            [role, email, emailVerified, hash, salt]
          )
          newId = res.rows[0]?.id != null ? Number(res.rows[0].id) : null
        }
        if (newId != null) userMap.set(oldId, newId)
      }
      await prodPool.query("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users))")
    } finally {
      await prodPool.end()
    }
  }
  console.log('Pushed users:', userMap.size)

  // 2) Settings – only pass known fields; ensure types and required businessName
  const settings = await payloadLocal.findGlobal({ slug: 'settings', depth: 0 }) as Record<string, unknown> | null
  if (settings && typeof settings === 'object') {
    const businessName = settings.businessName != null ? String(settings.businessName).trim() : ''
    const data: Record<string, unknown> = {
      businessName: businessName || 'Business',
      businessAddress: settings.businessAddress != null ? String(settings.businessAddress) : '',
      businessEmail: settings.businessEmail != null ? String(settings.businessEmail) : '',
      businessPhone: settings.businessPhone != null ? String(settings.businessPhone) : '',
      businessWebsite: settings.businessWebsite != null ? String(settings.businessWebsite) : '',
      logoUrl: settings.logoUrl != null ? String(settings.logoUrl) : '',
      invoicePrefix: settings.invoicePrefix != null ? String(settings.invoicePrefix) : 'INV-',
      taxRateDefault: Number(settings.taxRateDefault) || 0,
      currency: (settings.currency === 'MUR' || settings.currency === 'USD' || settings.currency === 'EUR') ? settings.currency : 'MUR',
    }
    try {
      await payloadProd.updateGlobal({ slug: 'settings', data })
      console.log('Pushed settings')
    } catch (err) {
      console.warn('Skipped settings (validation failed):', (err as Error).message)
    }
  }

  // 3) Clients – skip if name+email already exists on prod
  const existingClientByKey = new Map<string, number>()
  let clPage = 1
  while (true) {
    const res = await payloadProd.find({ collection: 'clients', limit: 500, page: clPage, depth: 0 })
    ;(res.docs ?? []).forEach((d: { name?: string; email?: string; id?: number }) => {
      if (d.name != null && d.id != null) {
        const key = `${String(d.name).trim().toLowerCase()}|${String(d.email ?? '').trim().toLowerCase()}`
        existingClientByKey.set(key, d.id as number)
      }
    })
    if (!res.hasNextPage) break
    clPage++
  }
  const clients = await fetchAll(payloadLocal, 'clients')
  const clientTotal = clients.length
  let clientsSkipped = 0
  for (let i = 0; i < clients.length; i++) {
    const doc = clients[i]!
    const id = doc.id as number
    const name = String(doc.name ?? '').trim()
    const email = String(doc.email ?? '').trim()
    const key = `${name.toLowerCase()}|${email.toLowerCase()}`

    const existingId = existingClientByKey.get(key)
    if (existingId != null) {
      clientMap.set(id, existingId)
      clientsSkipped++
    } else {
      const data = stripPayloadFields(doc) as Record<string, unknown>
      delete data.id
      try {
        const created = await payloadProd.create({ collection: 'clients', data })
        const newId = created.id as number
        clientMap.set(id, newId)
        existingClientByKey.set(key, newId)
      } catch (err) {
        console.warn(`  Skip client "${name}":`, (err as Error).message)
        clientsSkipped++
      }
    }
    if ((i + 1) % 50 === 0 || i === clientTotal - 1) {
      console.log(`Clients progress ${i + 1}/${clientTotal}...`)
    }
  }
  console.log('Pushed clients:', clientMap.size, clientsSkipped ? `(skipped ${clientsSkipped})` : '')

  // 4) Media
  const media = await fetchAll(payloadLocal, 'media')
  for (const doc of media) {
    const id = doc.id as number
    const data = stripPayloadFields(doc) as Record<string, unknown>
    delete data.id
    const created = await payloadProd.create({ collection: 'media', data })
    mediaMap.set(id, created.id as number)
  }
  console.log('Pushed media:', mediaMap.size)

  // 5) Invoices – normalize keys (camelCase) and skip duplicates (pre-load existing on prod to avoid N finds)
  const existingInvoiceByNumber = new Map<string, number>()
  let invPage = 1
  while (true) {
    const res = await payloadProd.find({ collection: 'invoices', limit: 500, page: invPage, depth: 0 })
    ;(res.docs ?? []).forEach((d: { invoiceNumber?: string; id?: number }) => {
      if (d.invoiceNumber != null && d.id != null) existingInvoiceByNumber.set(String(d.invoiceNumber), d.id as number)
    })
    if (!res.hasNextPage) break
    invPage++
  }
  const invoices = await fetchAll(payloadLocal, 'invoices')
  const invoiceTotal = invoices.length
  let invoicesSkipped = 0
  for (let i = 0; i < invoices.length; i++) {
    const doc = invoices[i]!
    const id = doc.id as number
    const invoiceNumber = String((doc.invoiceNumber ?? doc.invoice_number ?? '').toString()).trim()
    if (!invoiceNumber) {
      invoicesSkipped++
      continue
    }
    const existingId = existingInvoiceByNumber.get(invoiceNumber)
    if (existingId != null) {
      invoiceMap.set(id, existingId)
      invoicesSkipped++
      continue
    }
    const oldClientId = typeof doc.client === 'object' && doc.client && 'id' in doc.client
      ? (doc.client as { id: number }).id
      : (doc.client as number)
    const clientId = clientMap.get(oldClientId)
    if (clientId == null) {
      invoicesSkipped++
      continue
    }
    const data: Record<string, unknown> = {
      invoiceNumber,
      client: clientId,
      date: doc.date ?? new Date().toISOString().slice(0, 10),
      dueDate: doc.dueDate ?? doc.due_date ?? new Date().toISOString().slice(0, 10),
      status: doc.status ?? 'draft',
      items: Array.isArray(doc.items) ? doc.items : [{ description: 'Item', quantity: 1, rate: 0 }],
      taxRate: Number(doc.taxRate ?? doc.tax_rate) || 0,
      discount: Number(doc.discount) || 0,
      shipping: Number(doc.shipping) || 0,
      carNumber: doc.carNumber != null ? String(doc.carNumber) : undefined,
      notes: doc.notes != null ? String(doc.notes) : undefined,
      subtotal: Number(doc.subtotal) || 0,
      tax: Number(doc.tax) || 0,
      total: Number(doc.total) || 0,
    }
    try {
      const created = await payloadProd.create({ collection: 'invoices', data })
      const newId = created.id as number
      invoiceMap.set(id, newId)
      existingInvoiceByNumber.set(invoiceNumber, newId)
    } catch (err) {
      console.warn('Skip invoice', invoiceNumber, (err as Error).message)
      invoicesSkipped++
    }
    if ((i + 1) % 50 === 0 || i === invoiceTotal - 1) {
      console.log(`Invoices progress ${i + 1}/${invoiceTotal}...`)
    }
  }
  console.log('Pushed invoices:', invoiceMap.size, invoicesSkipped ? `(skipped ${invoicesSkipped})` : '')

  // 6) Quotes
  const quotes = await fetchAll(payloadLocal, 'quotes')
  for (const doc of quotes) {
    const id = doc.id as number
    const data = stripPayloadFields(doc) as Record<string, unknown>
    delete data.id
    const oldClientId = typeof data.client === 'object' && data.client && 'id' in data.client
      ? (data.client as { id: number }).id
      : (data.client as number)
    data.client = clientMap.get(oldClientId) ?? data.client
    const created = await payloadProd.create({ collection: 'quotes', data })
    quoteMap.set(id, created.id as number)
  }
  console.log('Pushed quotes:', quoteMap.size)

  // 7) Tasks
  const tasks = await fetchAll(payloadLocal, 'tasks')
  for (const doc of tasks) {
    const id = doc.id as number
    const data = stripPayloadFields(doc) as Record<string, unknown>
    delete data.id
    const oldClientId = typeof data.client === 'object' && data.client && 'id' in data.client
      ? (data.client as { id: number }).id
      : (data.client as number)
    if (oldClientId != null) data.client = clientMap.get(oldClientId) ?? data.client
    const created = await payloadProd.create({ collection: 'tasks', data })
    taskMap.set(id, created.id as number)
  }
  console.log('Pushed tasks:', taskMap.size)

  // 8) Transactions
  const transactions = await fetchAll(payloadLocal, 'transactions')
  for (const doc of transactions) {
    const id = doc.id as number
    const data = stripPayloadFields(doc) as Record<string, unknown>
    delete data.id
    const oldClientId = typeof data.client === 'object' && data.client && 'id' in data.client
      ? (data.client as { id: number }).id
      : (data.client as number)
    data.client = clientMap.get(oldClientId) ?? data.client
    const created = await payloadProd.create({ collection: 'transactions', data })
    transactionMap.set(id, created.id as number)
  }
  console.log('Pushed transactions:', transactionMap.size)

  // 9) Activity
  const activity = await fetchAll(payloadLocal, 'activity')
  for (const doc of activity) {
    const data = stripPayloadFields(doc) as Record<string, unknown>
    delete data.id
    const oldClientId = typeof data.client === 'object' && data.client && 'id' in data.client
      ? (data.client as { id: number }).id
      : (data.client as number)
    if (oldClientId != null) data.client = clientMap.get(oldClientId) ?? data.client
    const coll = data.relatedCollection as string | undefined
    const oldRelatedId = data.relatedId as number | undefined
    if (coll && oldRelatedId != null) {
      const map = coll === 'invoices' ? invoiceMap : coll === 'quotes' ? quoteMap : coll === 'tasks' ? taskMap : coll === 'transactions' ? transactionMap : null
      if (map) data.relatedId = map.get(oldRelatedId) ?? oldRelatedId
    }
    const oldCreatedBy = data.createdBy as number | undefined
    if (oldCreatedBy != null) {
      const newUserId = userMap.get(oldCreatedBy)
      data.createdBy = newUserId !== undefined ? newUserId : undefined
    }
    await payloadProd.create({ collection: 'activity', data })
  }
  console.log('Pushed activity:', activity.length)
  console.log('Done. Closing connections...')
  await payloadLocal.destroy()
  await payloadProd.destroy()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
