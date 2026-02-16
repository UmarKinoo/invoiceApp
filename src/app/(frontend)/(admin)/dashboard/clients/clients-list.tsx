'use client'

import Link from 'next/link'
import { Mail, Phone, ChevronRight, Pencil } from 'lucide-react'
import type { Client } from '@/payload-types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ClientsList({
  initialClients,
}: {
  initialClients: Client[]
}) {
  const clients = initialClients

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {clients.map((client) => (
        <Card
          key={client.id}
          className="overflow-hidden py-0 transition-colors hover:bg-card/80"
        >
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-base font-semibold text-foreground">
                  {(client.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="truncate text-sm font-semibold leading-none text-foreground">
                  {client.name}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {client.company || '—'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-0 text-xs font-medium text-primary hover:bg-transparent hover:text-primary/90" asChild>
              <Link href={`/dashboard/clients/${client.id}`}>
                View
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" asChild>
              <Link href={`/dashboard/clients/${client.id}/edit`} aria-label="Edit contact">
                <Pencil className="size-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
      {clients.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <p className="font-medium text-muted-foreground">No contacts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first contact to get started.
          </p>
        </div>
      )}
    </div>
  )
}
