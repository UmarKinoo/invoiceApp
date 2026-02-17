/**
 * Verify what data exists on the prod database.
 * Set DB_PROD in .env, then: pnpm run verify-prod-data
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
  const tables = ['users', 'clients', 'media', 'invoices', 'quotes', 'tasks', 'transactions', 'activity']
  console.log('Prod DB row counts (DB_PROD):')
  try {
    for (const table of tables) {
      const res = await pool.query(`SELECT count(*) as n FROM ${table}`)
      const n = res.rows[0]?.n ?? 0
      console.log(`  ${table}: ${n}`)
    }
    const settings = await pool.query('SELECT count(*) as n FROM settings')
    console.log('  settings:', settings.rows[0]?.n ?? 0)
  } finally {
    await pool.end()
  }
  console.log('\nIf counts are 0, run: pnpm run push-to-prod (with DATABASE_URI=local and DB_PROD=prod in .env)')
  console.log('If you see data here but not in the app, set your deployed app env DATABASE_URI to the prod URL.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
