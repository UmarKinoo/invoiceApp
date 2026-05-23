'use client'

import { usePathname } from 'next/navigation'
import type { User } from '@/payload-types'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SearchCommand } from '@/components/dashboard/search-command'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppMobileNav } from '@/components/layout/app-mobile-nav'
import { PageContainer } from '@/components/layout/page-container'
import { cn } from '@/lib/utils'

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: User | null
}) {
  const pathname = usePathname()
  const isAgentPage = pathname.startsWith('/dashboard/agent')

  return (
    <div className="dashboard-shell flex min-h-svh flex-col bg-background">
      <SearchCommand />
      <SidebarProvider className="min-h-0 flex-1">
        <AppSidebar user={user} />
        <SidebarInset className={cn('min-h-0', isAgentPage && 'overflow-hidden')}>
          <PageContainer
            className={cn(
              isAgentPage
                ? 'mx-0 flex h-[calc(100dvh-5.5rem)] max-w-none min-h-0 flex-col overflow-hidden px-2 py-2 pb-20 sm:px-3 lg:h-[calc(100dvh-1.5rem)] lg:px-4 lg:py-3 lg:pb-3'
                : 'pb-24 lg:pb-10',
            )}
          >
            {children}
          </PageContainer>
        </SidebarInset>
      </SidebarProvider>
      <AppMobileNav />
    </div>
  )
}
