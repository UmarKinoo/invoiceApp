import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload-server'

export type TestAuthContext = {
  payload: Payload
  user: User
  token: string
}

export function authCookieHeader(token: string): string {
  return `payload-token=${token}`
}

async function ensureTestUser(
  payload: Payload,
  email: string,
  password: string,
  role: 'admin' | 'user' = 'user',
): Promise<User> {
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.docs[0]) {
    await payload.update({
      collection: 'users',
      id: found.docs[0].id,
      data: { password, role },
      overrideAccess: true,
    })
    return found.docs[0] as User
  }

  const created = await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      role,
    },
    overrideAccess: true,
  })
  return created as User
}

async function loginTestUser(
  payload: Payload,
  email: string,
  password: string,
  role: 'admin' | 'user' = 'user',
): Promise<TestAuthContext> {
  await ensureTestUser(payload, email, password, role)
  const login = await payload.login({
    collection: 'users',
    data: { email, password },
  })
  if (!login.token || !login.user) {
    throw new Error(`Failed to login test user ${email}`)
  }
  return {
    payload,
    user: login.user as User,
    token: login.token,
  }
}

/** Login or register the test user (requires DATABASE_URI + PAYLOAD_SECRET). */
export async function getTestAuthContext(): Promise<TestAuthContext> {
  const email = process.env.TEST_USER_EMAIL ?? 'agent-test@invoiceapp.local'
  const password = process.env.TEST_USER_PASSWORD ?? 'AgentTest!pass123'
  const payload = await getPayloadClient()
  return loginTestUser(payload, email, password, 'admin')
}

/** Second user for forbidden thread tests. */
export async function getSecondaryTestAuthContext(): Promise<TestAuthContext> {
  const email = process.env.TEST_USER_EMAIL_2 ?? 'agent-test-2@invoiceapp.local'
  const password = process.env.TEST_USER_PASSWORD_2 ?? 'AgentTest2!pass123'
  const payload = await getPayloadClient()
  return loginTestUser(payload, email, password, 'user')
}
