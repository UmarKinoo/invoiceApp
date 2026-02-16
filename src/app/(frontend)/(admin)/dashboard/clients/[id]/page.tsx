import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { ArrowLeft, Mail, Phone, Building2 } from 'lucide-react'
import { ClientDetailActions } from './client-detail-actions'
import { ClientActivitySection } from './client-activity-section'
import type { Activity as ActivityType, Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let client: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findByID']>> | null = null
  try {
    const payload = await getPayloadClient()
    client = await payload.findByID({ collection: 'clients', id: Number(id) })
  } catch {
    client = null
  }
  if (!client) notFound()

  const clientDoc = client as Client

  let activities: ActivityType[] = []
  try {
    const payload = await getPayloadClient()
    const actRes = await payload.find({
      collection: 'activity',
      where: { client: { equals: clientDoc.id } },
      sort: '-createdAt',
      limit: 100,
      depth: 1,
    })
    activities = (actRes.docs ?? []) as ActivityType[]
  } catch {
    activities = []
  }

  const activityList = activities.map((a) => ({
    id: a.id,
    type: a.type ?? 'note',
    body: a.body ?? null,
    createdAt: a.createdAt ?? '',
    createdBy: a.createdBy ?? null,
    relatedCollection: a.relatedCollection ?? null,
    relatedId: a.relatedId ?? null,
    meta: (a.meta as Record<string, unknown>) ?? null,
  }))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4 flex-wrap">
        <Link
          href="/dashboard/clients"
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black text-white tracking-tighter">{clientDoc.name}</h2>
          <p className="text-sm text-muted-foreground">{clientDoc.company ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ClientDetailActions clientId={String(clientDoc.id)} />
        </div>
      </header>
      <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Mail className="size-5 shrink-0 text-primary/80" />
          <span>{clientDoc.email}</span>
        </div>
        {clientDoc.phone && (
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Phone className="size-5 shrink-0 text-primary/80" />
            <span>{clientDoc.phone}</span>
          </div>
        )}
        {clientDoc.company && (
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Building2 className="size-5 shrink-0 text-primary/80" />
            <span>{clientDoc.company}</span>
          </div>
        )}
        {clientDoc.address && (
          <div className="border-t border-border pt-4 text-sm text-muted-foreground">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Address</p>
            <p className="whitespace-pre-wrap">{clientDoc.address}</p>
          </div>
        )}
      </div>

      <ClientActivitySection clientId={String(clientDoc.id)} initialActivities={activityList} />
    </div>
  )
}
