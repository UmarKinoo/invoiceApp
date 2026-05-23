import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { getTestAuthContext } from '../helpers/payload-auth'

loadEnv({ path: path.resolve(process.cwd(), '.env') })
loadEnv({ path: path.resolve(process.cwd(), '.env.test'), override: true })

process.env.PAYLOAD_TEST_NO_PUSH = '1'
process.env.AGENT_E2E_MOCK = '1'

export default async function globalSetup() {
  if (!process.env.DATABASE_URI || !process.env.PAYLOAD_SECRET) {
    console.warn('[e2e] Skipping DB seed — set DATABASE_URI and PAYLOAD_SECRET')
    return
  }
  await getTestAuthContext()
}
