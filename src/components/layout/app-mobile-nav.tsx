'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Receipt, ListTodo, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Insights' },
  { href: '/dashboard/clients', icon: Users, label: 'Contacts' },
  { href: '/dashboard/invoices', icon: Receipt, label: 'Billing' },
  { href: '/dashboard/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
] as const

export function AppMobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="app-tab-bar fixed bottom-0 left-0 right-0 z-[100] flex items-stretch px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Primary navigation"
    >
      {MOBILE_TABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 transition-colors',
            isActive(item.href)
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-current={isActive(item.href) ? 'page' : undefined}
        >
          <item.icon className="size-6 shrink-0" aria-hidden />
          <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
