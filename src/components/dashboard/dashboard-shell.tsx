'use client'

import type { User } from '@/payload-types'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SearchCommand } from '@/components/dashboard/search-command'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppMobileNav } from '@/components/layout/app-mobile-nav'
import { PageContainer } from '@/components/layout/page-container'

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: User | null
}) {
  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-background">
      <SearchCommand />
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <PageContainer className="pb-24 lg:pb-10">{children}</PageContainer>
        </SidebarInset>
      </SidebarProvider>
      <AppMobileNav />
    </div>
  )
}
