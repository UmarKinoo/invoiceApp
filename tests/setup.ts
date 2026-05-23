import { config } from 'dotenv'
import path from 'node:path'

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.test'), override: true })

if (process.env.AGENT_E2E_MOCK !== '1') {
  process.env.AGENT_E2E_MOCK = '1'
}

process.env.PAYLOAD_TEST_NO_PUSH = '1'
