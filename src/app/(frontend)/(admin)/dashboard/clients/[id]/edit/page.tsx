import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload-server'
import { ArrowLeft } from 'lucide-react'
import { EditClientForm } from '../../edit-client-form'
import type { Client } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function EditClientPage({
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link
          href={`/dashboard/clients/${clientDoc.id}`}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">Edit Contact</h2>
          <p className="text-sm text-muted-foreground">{clientDoc.name}</p>
        </div>
      </header>
      <EditClientForm client={clientDoc} />
    </div>
  )
}
