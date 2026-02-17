/**
 * Clean up duplicate rows in the local DB caused by the singleton bug
 * (push-to-prod was writing back to local instead of prod).
 *
 * For each collection the script keeps the row with the LOWEST id per unique
 * identity and re-points FK references before deleting duplicates.
 *
 * Run: pnpm run cleanup-local
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

async function main() {
  loadEnv()
  const localUri = process.env.DATABASE_URI
  if (!localUri) {
    console.error('Set DATABASE_URI in .env')
    process.exit(1)
  }

  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: localUri })

  try {
    // --- Show current counts ---
    const tables = ['clients', 'invoices', 'activity', 'quotes', 'tasks', 'transactions']
    console.log('BEFORE cleanup:')
    for (const t of tables) {
      const r = await pool.query(`SELECT count(*) as n FROM ${t}`)
      console.log(`  ${t}: ${r.rows[0]?.n}`)
    }

    // =============================================
    // Step 1: Build client dedup mapping (dup_id → kept_id)
    // =============================================
    const clientMapping = await pool.query(`
      SELECT c.id AS dup_id, kept.id AS kept_id
      FROM clients c
      JOIN (SELECT MIN(id) AS id, name, email FROM clients GROUP BY name, email) kept
        ON kept.name = c.name AND kept.email = c.email
      WHERE c.id != kept.id
    `)
    const clientMap = new Map<number, number>()
    for (const row of clientMapping.rows) {
      clientMap.set(row.dup_id, row.kept_id)
    }
    console.log(`\nFound ${clientMap.size} duplicate client rows to remove`)

    // =============================================
    // Step 2: Re-point FK references from dup → kept BEFORE deleting
    // =============================================
    if (clientMap.size > 0) {
      // Build a VALUES list for the mapping
      const mappingValues = Array.from(clientMap.entries())
        .map(([dup, kept]) => `(${dup}, ${kept})`)
        .join(', ')

      // Update activity.client_id
      const actUpd = await pool.query(`
        UPDATE activity SET client_id = m.kept_id
        FROM (VALUES ${mappingValues}) AS m(dup_id, kept_id)
        WHERE activity.client_id = m.dup_id
      `)
      console.log(`  Re-pointed ${actUpd.rowCount} activity rows`)

      // Update invoices.client_id (if any reference dup clients)
      const invUpd = await pool.query(`
        UPDATE invoices SET client_id = m.kept_id
        FROM (VALUES ${mappingValues}) AS m(dup_id, kept_id)
        WHERE invoices.client_id = m.dup_id
      `)
      console.log(`  Re-pointed ${invUpd.rowCount} invoice rows`)

      // Update quotes.client_id
      try {
        const qUpd = await pool.query(`
          UPDATE quotes SET client_id = m.kept_id
          FROM (VALUES ${mappingValues}) AS m(dup_id, kept_id)
          WHERE quotes.client_id = m.dup_id
        `)
        console.log(`  Re-pointed ${qUpd.rowCount} quote rows`)
      } catch { /* table might not have client_id */ }

      // Update tasks.client_id
      try {
        const tUpd = await pool.query(`
          UPDATE tasks SET client_id = m.kept_id
          FROM (VALUES ${mappingValues}) AS m(dup_id, kept_id)
          WHERE tasks.client_id = m.dup_id
        `)
        console.log(`  Re-pointed ${tUpd.rowCount} task rows`)
      } catch { /* ignore */ }

      // Update transactions.client_id
      try {
        const trUpd = await pool.query(`
          UPDATE transactions SET client_id = m.kept_id
          FROM (VALUES ${mappingValues}) AS m(dup_id, kept_id)
          WHERE transactions.client_id = m.dup_id
        `)
        console.log(`  Re-pointed ${trUpd.rowCount} transaction rows`)
      } catch { /* ignore */ }
    }

    // =============================================
    // Step 3: Delete duplicate clients (FKs already re-pointed)
    // =============================================
    if (clientMap.size > 0) {
      const dupIds = Array.from(clientMap.keys()).join(', ')
      const delClients = await pool.query(`DELETE FROM clients WHERE id IN (${dupIds})`)
      console.log(`Deleted ${delClients.rowCount} duplicate clients`)
    }

    // =============================================
    // Step 4: Delete duplicate activity rows (keep lowest id per group)
    // =============================================
    const dupActivity = await pool.query(`
      DELETE FROM activity
      WHERE id NOT IN (
        SELECT MIN(id) FROM activity
        GROUP BY type, COALESCE(body, ''), client_id,
                 COALESCE(related_collection::text, '_none_'),
                 COALESCE(related_id, -1)
      )
    `)
    console.log(`Deleted ${dupActivity.rowCount} duplicate activity rows`)

    // =============================================
    // Step 5: Delete duplicate invoices (keep lowest id per invoice_number)
    // =============================================
    const dupInvoices = await pool.query(`
      DELETE FROM invoices
      WHERE id NOT IN (
        SELECT MIN(id) FROM invoices GROUP BY invoice_number
      )
    `)
    console.log(`Deleted ${dupInvoices.rowCount} duplicate invoices`)

    // --- Reset sequences ---
    for (const t of tables) {
      try {
        await pool.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${t}))`)
      } catch { /* ignore */ }
    }

    // --- Show final counts ---
    console.log('\nAFTER cleanup:')
    for (const t of tables) {
      const r = await pool.query(`SELECT count(*) as n FROM ${t}`)
      console.log(`  ${t}: ${r.rows[0]?.n}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
