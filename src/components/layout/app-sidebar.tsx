'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ListTodo,
  FileText,
  Receipt,
  List,
  Plus,
  Wallet,
  Sparkles,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { User } from '@/payload-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const SIDEBAR_NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/clients', icon: Users, label: 'Contacts' },
  { href: '/dashboard/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/dashboard/quotes', icon: FileText, label: 'Quotes' },
  { href: '/dashboard/invoices', icon: Receipt, label: 'Invoices' },
  { href: '/dashboard/transactions', icon: Wallet, label: 'Ledger' },
  { href: '/dashboard/insights', icon: Sparkles, label: 'AI Insights' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

const SIDEBAR_SECTIONS = [
  { title: 'Core', items: SIDEBAR_NAV.slice(0, 3) },
  { title: 'Sales', items: SIDEBAR_NAV.slice(3, 6) },
  { title: 'Intelligence', items: SIDEBAR_NAV.slice(6, 7) },
  { title: 'System', items: SIDEBAR_NAV.slice(7, 8) },
]

const INVOICES_SUBMENU = [
  { href: '/dashboard/invoices', icon: List, label: 'All Invoices' },
  { href: '/dashboard/invoices?new=1', icon: Plus, label: 'New Invoice' },
] as const

function avatarUrl(user: User | null): string {
  if (!user?.email) return ''
  const name = user.email.split('@')[0] ?? 'User'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`
}

function displayName(user: User | null): string {
  if (!user?.email) return 'User'
  return user.email
}

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href.startsWith('/dashboard/invoices?')) {
      const isNew = searchParams.get('new') === '1'
      return pathname === '/dashboard/invoices' && isNew
    }
    if (href === '/dashboard/invoices') {
      return pathname === '/dashboard/invoices' && searchParams.get('new') !== '1'
    }
    return pathname.startsWith(href)
  }

  const isInvoicesList = pathname === '/dashboard/invoices'
  const isNewInvoice = isInvoicesList && searchParams.get('new') === '1'
  const isInvoicesDetail = pathname.startsWith('/dashboard/invoices/') && pathname !== '/dashboard/invoices'

  return (
    <Sidebar className="border-sidebar-border border-r">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="text-sidebar-foreground">
          <span className="text-lg font-semibold tracking-tight">Swiftbook</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  if (item.href === '/dashboard/invoices') {
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isInvoicesList || isInvoicesDetail}>
                          <Link href="/dashboard/invoices">
                            <item.icon className="size-4" />
                            <span>Invoices</span>
                          </Link>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {INVOICES_SUBMENU.map((sub) => (
                            <SidebarMenuSubItem key={sub.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  sub.href.includes('new=1')
                                    ? isNewInvoice
                                    : (isInvoicesList && !isNewInvoice) || isInvoicesDetail
                                }
                              >
                                <Link href={sub.href}>
                                  <sub.icon className="size-4" />
                                  <span>{sub.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    )
                  }
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-2">
        <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={avatarUrl(user)} alt="" />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {displayName(user).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName(user)}
            </p>
            <p className="text-xs text-muted-foreground">Account</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
