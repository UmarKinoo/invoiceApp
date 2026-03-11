'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export async function createActivityNote(data: {
  client: number
  body: string
}): Promise<{ doc?: { id: number; body?: string; createdAt?: string }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'activity',
      data: {
        client: data.client,
        type: 'note',
        body: data.body,
      },
    })
    revalidatePath(`/dashboard/clients/${data.client}`)
    return {
      doc: {
        id: doc.id as number,
        body: (doc as { body?: string }).body,
        createdAt: (doc as { createdAt?: string }).createdAt,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add note' }
  }
}
