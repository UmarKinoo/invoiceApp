'use client'

import { Skeleton } from '@/components/ui/skeleton'

type PageSkeletonProps = {
  /** Number of list rows to show. Default 6. */
  rows?: number
  /** Show header with title + description + action slot. Default true. */
  hasHeader?: boolean
  /** Show a single card area (e.g. for list pages). Default true. */
  hasCard?: boolean
}

export function PageSkeleton({ rows = 6, hasHeader = true, hasCard = true }: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 lg:space-y-8">
      {hasHeader && (
        <header className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 pr-12 sm:pr-0">
            <Skeleton className="h-8 w-36 sm:h-9 sm:w-44" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <div className="absolute right-0 top-0 flex gap-2 sm:relative">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </header>
      )}

      {hasCard && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="size-12 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 sm:w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
