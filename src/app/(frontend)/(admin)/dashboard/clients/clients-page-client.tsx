'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Plus, Mail, Phone, Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/page-header'

type ClientDoc = {
  id: string
  name: string | null
  company?: string | null
  email: string | null
  phone?: string | null
  address?: string | null
}

export function ClientsPageClient({ initialClients }: { initialClients: ClientDoc[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
  })

  const handleDeleteClient = async () => {
    if (!deleteClientId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/clients/${deleteClientId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setDeleteClientId(null)
      router.refresh()
    } catch {
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newClient.name || !newClient.email) return
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })
      if (!res.ok) throw new Error('Failed')
      setShowAdd(false)
      setNewClient({ name: '', company: '', email: '', phone: '', address: '' })
      router.refresh()
    } catch {
      // keep form open on error
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 lg:space-y-8">
      <PageHeader
        title="Contacts"
        description="Enterprise professional network."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="/api/export/clients" download>
                <Download className="size-4" />
                <span className="hidden lg:inline">Export CSV</span>
              </a>
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="size-4 lg:hidden" />
              <span className="hidden lg:inline">Expand</span>
              <Plus className="size-4 hidden lg:inline" />
            </Button>
          </div>
        }
      />

      {showAdd && (
        <Card className="fixed inset-x-4 bottom-24 z-[110] animate-in slide-in-from-bottom-8 duration-500 lg:relative lg:inset-auto lg:bottom-0">
          <CardContent className="p-6 lg:p-8">
            <h3 className="mb-6 text-lg font-semibold tracking-tight lg:mb-8">
              New contact
            </h3>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mb-8 lg:gap-6">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  placeholder="Full Name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="Company Name"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@provider.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  placeholder="+1 (000) 000-0000"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                Discard
              </Button>
              <Button className="flex-1" onClick={handleAdd}>
                Save entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setShowAdd(false)}
          onKeyDown={() => {}}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {initialClients.map((client) => (
          <Card key={client.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
              <div className="relative">
                <Avatar className="size-12 shrink-0 overflow-hidden rounded-full border border-border">
                  <AvatarImage
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.name ?? client.email ?? 'Contact')}&background=ffffff&color=000000&size=200`}
                    alt={client.name ?? ''}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white text-black text-sm font-medium">
                    {(client.name ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="truncate text-base leading-none">
                  {client.name ?? '—'}
                </CardTitle>
                <CardDescription className="truncate text-xs">
                  {client.company ?? '—'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{client.email ?? '—'}</span>
              </div>
              {client.phone ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
              ) : null}
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-row items-center justify-between gap-2">
              <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                <Link href={`/dashboard/clients/${client.id}`}>Records</Link>
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/dashboard/clients/${client.id}/edit`} aria-label="Edit contact">
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteClientId(String(client.id))}
                  aria-label="Delete contact"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Invoices or quotes linked to this contact may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteClient}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
