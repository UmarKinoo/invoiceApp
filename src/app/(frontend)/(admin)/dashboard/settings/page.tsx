import { Shield } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload-server'
import { SettingsForm } from './settings-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let settings: Awaited<ReturnType<Awaited<ReturnType<typeof getPayloadClient>>['findGlobal']>> | null = null
  try {
    const payload = await getPayloadClient()
    settings = await payload.findGlobal({ slug: 'settings' })
  } catch {
    settings = null
  }

  const defaultSettings = {
    businessName: '',
    businessAddress: '',
    businessEmail: '',
    businessPhone: '',
    businessWebsite: '',
    logoUrl: '',
    invoicePrefix: 'INV-',
    taxRateDefault: 0,
    currency: 'MUR',
  }

  const initial = settings
    ? {
        businessName: settings.businessName ?? defaultSettings.businessName,
        businessAddress: settings.businessAddress ?? defaultSettings.businessAddress,
        businessEmail: settings.businessEmail ?? defaultSettings.businessEmail,
        businessPhone: settings.businessPhone ?? defaultSettings.businessPhone,
        businessWebsite: settings.businessWebsite ?? defaultSettings.businessWebsite,
        logoUrl: settings.logoUrl ?? defaultSettings.logoUrl,
        invoicePrefix: settings.invoicePrefix ?? defaultSettings.invoicePrefix,
        taxRateDefault: Number(settings.taxRateDefault) ?? defaultSettings.taxRateDefault,
        currency: settings.currency ?? defaultSettings.currency,
      }
    : defaultSettings

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="System"
        description="Global enterprise config."
      />
      <SettingsForm initial={initial} />
      <Card className="flex items-center justify-between">
        <CardContent className="flex flex-1 items-center justify-between py-6">
          <div>
            <p className="text-sm font-medium text-foreground">Secure storage</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              All data stored locally and synced via TLS.
            </p>
          </div>
          <Shield className="size-6 text-emerald-600 dark:text-emerald-400" />
        </CardContent>
      </Card>
    </div>
  )
}
