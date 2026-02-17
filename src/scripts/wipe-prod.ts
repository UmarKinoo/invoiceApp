/**
 * Wipe all data from prod DB so we can do a clean push.
 * Keeps schema (tables + migrations) intact - only deletes rows.
 *
 * Run: pnpm exec tsx src/scripts/wipe-prod.ts
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
  const prodUri = process.env.DB_PROD
  if (!prodUri) {
    console.error('Set DB_PROD in .env')
    process.exit(1)
  }

  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: prodUri })

  // Order matters for FK constraints: delete child tables first
  const dataTables = [
    'activity',
    'invoices_items',
    'invoices',
    'quotes',
    'tasks',
    'transactions',
    'media',
    'clients',
    'users',
  ]

  try {
    console.log('Wiping prod data tables...')
    for (const table of dataTables) {
      try {
        const res = await pool.query(`DELETE FROM ${table}`)
        console.log(`  ${table}: deleted ${res.rowCount} rows`)
      } catch (err) {
        console.warn(`  ${table}: ${(err as Error).message}`)
      }
    }

    // Reset settings global to empty
    try {
      await pool.query(`DELETE FROM settings`)
      console.log('  settings: cleared')
    } catch (err) {
      console.warn(`  settings: ${(err as Error).message}`)
    }

    // Reset sequences
    for (const table of dataTables) {
      try {
        await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)`)
      } catch {
        // ignore
      }
    }

    console.log('\nProd wiped. Run: pnpm run push-to-prod')
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
