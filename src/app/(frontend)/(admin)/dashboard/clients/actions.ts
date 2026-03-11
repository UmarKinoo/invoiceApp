'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export type CreateClientInput = {
  name: string
  company?: string
  email: string
  phone?: string
  address?: string
  brn?: string
}

export async function createClient(
  data: CreateClientInput
): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'clients',
      data: {
        name: data.name,
        company: data.company ?? undefined,
        email: data.email,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        brn: data.brn ?? undefined,
      },
    })
    revalidatePath('/dashboard/clients')
    return { doc: { id: doc.id as number } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create client' }
  }
}

export async function updateClient(
  id: number,
  data: Partial<CreateClientInput>
): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'clients',
      id,
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.company != null && { company: data.company }),
        ...(data.email != null && { email: data.email }),
        ...(data.phone != null && { phone: data.phone }),
        ...(data.address != null && { address: data.address }),
        ...(data.brn != null && { brn: data.brn }),
      },
    })
    revalidatePath('/dashboard/clients')
    revalidatePath(`/dashboard/clients/${id}`)
    return { doc: { id } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update client' }
  }
}

export async function deleteClient(id: number): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'clients', id })
    revalidatePath('/dashboard/clients')
    return { ok: true }
  } catch {
    return { error: 'Failed to delete client' }
  }
}

export async function getClients(limit = 100): Promise<{ docs: { id: number; name: string | null; company: string | null; email: string | null }[] }> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'clients', limit, depth: 0 })
    return { docs: (res.docs ?? []) as { id: number; name: string | null; company: string | null; email: string | null }[] }
  } catch {
    return { docs: [] }
  }
}
