'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ListPagination({
  currentPage,
  totalPages,
  basePath,
  className,
  preserveParams,
}: {
  currentPage: number
  totalPages: number
  basePath: string
  className?: string
  /** Query params to preserve when building page links (e.g. { edit: '1' }) */
  preserveParams?: Record<string, string>
}) {
  const search = new URLSearchParams()
  if (preserveParams) {
    Object.entries(preserveParams).forEach(([k, v]) => {
      if (v != null && v !== '') search.set(k, v)
    })
  }

  const href = (page: number) => {
    const p = new URLSearchParams(search)
    if (page > 1) p.set('page', String(page))
    const q = p.toString()
    return q ? `${basePath}?${q}` : basePath
  }

  const safeTotalPages = Number.isFinite(totalPages) && totalPages >= 1 ? totalPages : 1
  const hasPrev = currentPage > 1
  const hasNext = currentPage < safeTotalPages
  const showNav = safeTotalPages > 1

  return (
    <Pagination className={cn('mt-6', className)}>
      <PaginationContent className="flex flex-wrap items-center justify-center gap-2">
        <PaginationItem>
          {showNav && hasPrev ? (
            <Link
              href={href(currentPage - 1)}
              aria-label="Go to previous page"
              className={buttonVariants({ variant: 'ghost', size: 'default' }) + ' gap-1 px-2.5 sm:pl-2.5'}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <span className="flex cursor-not-allowed items-center gap-1 rounded-md border border-transparent px-2.5 py-2 text-sm text-muted-foreground opacity-50">
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Previous</span>
            </span>
          )}
        </PaginationItem>
        <PaginationItem className="text-xs text-muted-foreground">
          <span className="px-2">
            Page {currentPage} of {safeTotalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          {showNav && hasNext ? (
            <Link
              href={href(currentPage + 1)}
              aria-label="Go to next page"
              className={buttonVariants({ variant: 'ghost', size: 'default' }) + ' gap-1 px-2.5 sm:pr-2.5'}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="flex cursor-not-allowed items-center gap-1 rounded-md border border-transparent px-2.5 py-2 text-sm text-muted-foreground opacity-50">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </span>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
