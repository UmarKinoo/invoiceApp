'use client'

import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { SubmitButton } from '@/components/auth/submit-button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

import Link from 'next/link'

import { loginUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import type { LoginResponse } from '@/lib/auth'

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const res: LoginResponse = await loginUser({ email, password, rememberMe })

    setIsPending(false)

    if (res.error) {
      // Show error toast with specific error message
      switch (res.errorCode) {
        case 'INVALID_EMAIL':
          toast.error('Invalid Email', {
            description: res.error,
          })
          break
        case 'INVALID_CREDENTIALS':
          toast.error('Invalid Credentials', {
            description: 'The email or password you entered is incorrect',
          })
          break
        case 'AUTH_ERROR':
          toast.error('Authentication Failed', {
            description: 'Please try again later',
          })
          break
        default:
          toast.error('Login Failed', {
            description: res.error || 'Something went wrong',
          })
      }
    } else {
      toast.success('Welcome back!', {
        description: 'Redirecting to dashboard...',
      })
      router.push('/dashboard')
    }
  }

  return (
    <form className="my-5 sm:my-6 space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
      <FieldGroup className="gap-5 sm:gap-6">
        <Field>
          <FieldLabel htmlFor="email" className="text-sm font-medium">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            className="min-h-[44px] text-base sm:text-sm px-4 py-3"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password" className="text-sm font-medium">
            Password
          </FieldLabel>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="min-h-[44px] text-base sm:text-sm px-4 py-3"
          />
          <FieldDescription>
            <Link
              href="/forgot-password"
              className="inline-block min-h-[44px] leading-[44px] py-0 hover:underline active:opacity-70"
            >
              Forgot password?
            </Link>
          </FieldDescription>
        </Field>

        <Field orientation="horizontal" className="min-h-[44px] items-center gap-3">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="size-5 sm:size-4 shrink-0 touch-manipulation"
          />
          <FieldLabel htmlFor="remember-me" className="text-sm cursor-pointer touch-manipulation">
            Remember me for 30 days
          </FieldLabel>
        </Field>

        <SubmitButton loading={isPending} text="Login" />
      </FieldGroup>
    </form>
  )
}
