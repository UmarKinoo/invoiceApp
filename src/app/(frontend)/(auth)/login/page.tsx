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
      <Section className="py-4 sm:py-6">
        <Container className="max-w-[min(100%,22rem)] mx-auto px-4 sm:px-6">
          <AuthBox>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Login</h1>
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
