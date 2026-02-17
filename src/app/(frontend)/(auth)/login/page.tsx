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
      <Section className="w-full min-w-0 py-4 sm:py-6">
        <Container className="w-full max-w-full px-4 mx-auto sm:max-w-[22rem] sm:px-6">
          <AuthBox>
            <p className="text-xl font-semibold tracking-tight text-foreground">Swiftbook</p>
            <h1 className="text-lg font-medium tracking-tight text-muted-foreground">Login</h1>
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
