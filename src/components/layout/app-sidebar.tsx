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
  LogOut,
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
import { clearAuthCookies } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'

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
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffffff&color=000000`
}

function displayName(user: User | null): string {
  if (!user?.email) return 'User'
  return user.email
}

function AccountMenuContent({
  user,
  isLoggingOut,
  onLogout,
  onSettings,
  onClose,
}: {
  user: User | null
  isLoggingOut: boolean
  onLogout: () => Promise<void>
  onSettings: () => void
  onClose?: () => void
}) {
  return (
    <>
      <div className="px-2 py-2">
        <p className="text-sm font-medium text-foreground">{displayName(user)}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
      </div>
      <div className="border-t px-1 py-1">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm text-destructive outline-none hover:bg-destructive/10"
          onClick={async () => {
            await onLogout()
            onClose?.()
          }}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4 shrink-0" />
          {isLoggingOut ? 'Signing out...' : 'Log out'}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent"
          onClick={() => {
            onSettings()
            onClose?.()
          }}
        >
          <Settings className="size-4 shrink-0" />
          Settings
        </button>
      </div>
    </>
  )
}

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

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
        <Link href="/" className="text-sidebar-foreground">
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
      <SidebarFooter className="border-sidebar-border border-t mt-auto pt-4 p-2">
        {isMobile ? (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-left outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 min-h-[44px] touch-manipulation"
                aria-label="Account menu"
              >
                <Avatar className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-white">
                  <AvatarImage src={avatarUrl(user)} alt="" className="object-cover" />
                  <AvatarFallback className="bg-white text-black text-xs font-medium">
                    {displayName(user).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {displayName(user)}
                  </p>
                  <p className="text-xs text-muted-foreground">Account</p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)] pt-6">
              <SheetHeader className="sr-only">
                <SheetTitle>Account</SheetTitle>
              </SheetHeader>
              <div className="px-2 pb-2">
              <AccountMenuContent
                user={user}
                isLoggingOut={isLoggingOut}
                onLogout={async () => {
                  if (isLoggingOut) return
                  setIsLoggingOut(true)
                  try {
                    const result = await clearAuthCookies()
                    if (result.success) {
                      router.push('/')
                      router.refresh()
                    }
                  } finally {
                    setIsLoggingOut(false)
                  }
                }}
                onSettings={() => router.push('/dashboard/settings')}
                onClose={() => setSheetOpen(false)}
              />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-left outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 min-h-[44px]"
                aria-label="Account menu"
              >
                <Avatar className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-white">
                  <AvatarImage src={avatarUrl(user)} alt="" className="object-cover" />
                  <AvatarFallback className="bg-white text-black text-xs font-medium">
                    {displayName(user).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {displayName(user)}
                  </p>
                  <p className="text-xs text-muted-foreground">Account</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              className="z-[100] w-[--radix-dropdown-menu-trigger-width] min-w-56"
            >
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-foreground">{displayName(user)}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  if (isLoggingOut) return
                  setIsLoggingOut(true)
                  try {
                    const result = await clearAuthCookies()
                    if (result.success) {
                      router.push('/')
                      router.refresh()
                    }
                  } finally {
                    setIsLoggingOut(false)
                  }
                }}
                disabled={isLoggingOut}
              >
                <LogOut className="size-4" />
                {isLoggingOut ? 'Signing out...' : 'Log out'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
