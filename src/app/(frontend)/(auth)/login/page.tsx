import { Section, Container } from '@/components/ds'
import { LoginForm } from '@/components/auth/login-form'
import { AuthBox } from '@/components/auth/auth-box'
import { LoginPageToast } from '@/components/auth/login-page-toast'
import { BeamsPageLayout } from '@/components/beams/BeamsPageLayout'

import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const user: User | null = await getUser()

  if (user) {
    redirect('/dashboard')
  }

  const params = await searchParams

  return (
    <BeamsPageLayout>
      <Section>
        <Container>
          <AuthBox>
            <h1>Login</h1>
            {(params.success || params.error) && (
              <LoginPageToast success={params.success} error={params.error} />
            )}
            <LoginForm />
          </AuthBox>
        </Container>
      </Section>
    </BeamsPageLayout>
  )
}
