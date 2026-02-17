'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wallet, Clock, Users, TrendingUp, FilePlus, UserPlus, LogOut, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { User } from '@/payload-types'
import { formatCurrency } from '@/lib/utils'
import { clearAuthCookies } from '@/lib/auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DashboardChart } from '@/app/(frontend)/(admin)/dashboard/dashboard-chart'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

type InvoiceDoc = {
  id: string
  invoiceNumber: string | null
  date: string | null
  total: number
  status?: string | null
}

type ClientDoc = { id: string }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function avatarUrl(user: User | null): string {
  if (!user?.email) return ''
  const name = user.email.split('@')[0] ?? 'User'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffffff&color=000000`
}

function displayName(user: User | null): string {
  return user?.email ?? 'User'
}

const StatCard: React.FC<{
  label: string
  value: string
  icon: LucideIcon
}> = ({ label, value, icon: Icon }) => (
  <Card className="relative overflow-hidden py-0 transition-colors hover:bg-card/80">
    <CardContent className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          Realtime
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="min-h-[2rem] font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl lg:text-[27px]">
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
)

export function DashboardPageClient({
  user,
  invoices,
  clients,
}: {
  user: User | null
  invoices: InvoiceDoc[]
  clients: ClientDoc[]
}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isMobile = useIsMobile()

  const stats = useMemo(() => {
    const paid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
    const outstanding = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
    return {
      paid,
      outstanding,
      clients: clients.length,
      count: invoices.length,
    }
  }, [invoices, clients])

  const chartData = useMemo(() => {
    const now = new Date()
    const months: { name: string; amount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const name = MONTH_NAMES[d.getMonth()]
      const amount = invoices
        .filter((inv) => {
          const dateStr = inv.date ?? ''
          const invMonth = dateStr.slice(0, 7)
          return invMonth === monthKey && inv.status === 'paid'
        })
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
      months.push({ name, amount })
    }
    return months
  }, [invoices])

  const formatDate = (d: string | null) => (d ? d.slice(0, 10) || d : '')
  const profileAvatarUrl = avatarUrl(user)

  const avatarTrigger = (
    <button
      type="button"
      className="shrink-0 rounded-full outline-none ring-sidebar-ring focus-visible:ring-2"
      aria-label="Account menu"
    >
      <Avatar className="size-10 shrink-0 overflow-hidden rounded-full border-2 border-border">
        <AvatarImage src={profileAvatarUrl} alt="Profile" className="object-cover" />
        <AvatarFallback className="bg-white text-black text-xs font-medium">
          {(user?.email?.slice(0, 2) ?? 'U').toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </button>
  )

  const accountMenuContent = (
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
            setSheetOpen(false)
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
            router.push('/dashboard/settings')
            setSheetOpen(false)
          }}
        >
          <Settings className="size-4 shrink-0" />
          Settings
        </button>
      </div>
    </>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 lg:space-y-10">
      <PageHeader
        title="Swiftbook"
        description={isMobile ? 'Dashboard' : 'Insights'}
        actions={
          isMobile ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>{avatarTrigger}</SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)] pt-6">
                <SheetHeader className="sr-only">
                  <SheetTitle>Account</SheetTitle>
                </SheetHeader>
                <div className="px-2 pb-2">{accountMenuContent}</div>
              </SheetContent>
            </Sheet>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{avatarTrigger}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="z-[100] min-w-56">
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
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[72px] justify-start gap-5 border-primary/20 bg-primary/5 p-6 hover:bg-primary/10"
          onClick={() => router.push('/dashboard/invoices?new=1')}
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <FilePlus className="size-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold leading-none text-foreground">Initiate Billing</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Create New Invoice
            </p>
          </div>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[72px] justify-start gap-5 border-emerald-500/20 bg-emerald-500/5 p-6 hover:bg-emerald-500/10"
          onClick={() => router.push('/dashboard/clients')}
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <UserPlus className="size-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold leading-none text-foreground">Expand Network</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Register New Contact
            </p>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        <StatCard
          label="Cash Flow"
          value={formatCurrency(stats.paid)}
          icon={Wallet}
        />
        <StatCard
          label="Capital Out"
          value={formatCurrency(stats.outstanding)}
          icon={Clock}
        />
        <StatCard label="Network" value={stats.clients.toString()} icon={Users} />
        <StatCard label="Registry" value={stats.count.toString()} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Market Velocity
            </h4>
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Performance
            </span>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Recent Flow
            </h4>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {invoices.slice(0, 5).map((inv) => (
              <Link
                key={inv.id}
                href="/dashboard/invoices"
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs font-semibold tracking-tight text-foreground">
                      {inv.invoiceNumber ?? '—'}
                    </p>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      {formatDate(inv.date)}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-xs font-semibold tabular-nums tracking-tight text-foreground">
                  {formatCurrency(Number(inv.total), 'MUR', { decimals: 0 })}
                </p>
              </Link>
            ))}
            {invoices.length === 0 && (
              <p className="py-10 text-center text-xs font-medium uppercase italic text-muted-foreground">
                No transactions yet.
              </p>
            )}
            <Button asChild className="mt-4 w-full">
              <Link href="/dashboard/invoices">View full ledger</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
