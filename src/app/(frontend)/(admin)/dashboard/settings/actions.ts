'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export type SettingsUpdate = {
  businessName?: string
  businessAddress?: string
  businessEmail?: string
  businessPhone?: string
  businessWebsite?: string
  logoUrl?: string
  logo?: number | null
  logoWhite?: number | null
  businessBrn?: string
  vatRegistrationNumber?: string
  invoicePrefix?: string
  taxRateDefault?: number
  currency?: string
}

export async function updateSettings(data: SettingsUpdate): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.updateGlobal({ slug: 'settings', data: data as any })
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard/invoices')
    revalidatePath('/dashboard/quotes')
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update settings' }
  }
}
