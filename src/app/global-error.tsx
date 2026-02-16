'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground">
        <h2 className="mb-2 text-2xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">A critical error occurred.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
