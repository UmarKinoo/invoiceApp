'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 lg:space-y-10">
      <header className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 pr-12 sm:pr-0">
          <Skeleton className="h-8 w-32 sm:h-9 sm:w-40" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <Skeleton className="absolute right-0 top-0 size-10 rounded-full sm:relative" />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        <Skeleton className="h-[72px] rounded-lg" />
        <Skeleton className="h-[72px] rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24 sm:h-9 lg:h-[27px]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
            <Skeleton className="mt-4 h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
