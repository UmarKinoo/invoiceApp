'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-2xl font-semibold text-foreground">Something went wrong</h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        An error occurred. You can try again or return to the dashboard.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
