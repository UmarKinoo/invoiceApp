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
    settings = await payload.findGlobal({ slug: 'settings', depth: 1 })
  } catch {
    settings = null
  }

  const s = settings as Record<string, unknown> | null
  const logoObj = s?.logo as { url?: string; id?: number } | number | null | undefined
  const logoUrlFromMedia = logoObj && typeof logoObj === 'object' && 'url' in logoObj && logoObj.url
  const logoWhiteObj = s?.logoWhite as { url?: string; id?: number } | number | null | undefined
  const logoWhiteUrlFromMedia = logoWhiteObj && typeof logoWhiteObj === 'object' && 'url' in logoWhiteObj && logoWhiteObj.url

  const defaultSettings = {
    businessName: '',
    businessAddress: '',
    businessEmail: '',
    businessPhone: '',
    businessWebsite: '',
    logoUrl: '',
    logo: null as { url: string; id: number } | null,
    logoWhite: null as { url: string; id: number } | null,
    businessBrn: '',
    vatRegistrationNumber: '',
    invoicePrefix: 'INV-',
    taxRateDefault: 0,
    currency: 'MUR',
  }

  const initial = settings
    ? {
        businessName: (s?.businessName as string) ?? defaultSettings.businessName,
        businessAddress: (s?.businessAddress as string) ?? defaultSettings.businessAddress,
        businessEmail: (s?.businessEmail as string) ?? defaultSettings.businessEmail,
        businessPhone: (s?.businessPhone as string) ?? defaultSettings.businessPhone,
        businessWebsite: (s?.businessWebsite as string) ?? defaultSettings.businessWebsite,
        logoUrl: (logoUrlFromMedia as string) ?? (s?.logoUrl as string) ?? defaultSettings.logoUrl,
        logo: logoObj && typeof logoObj === 'object' && logoObj !== null && 'url' in logoObj && 'id' in logoObj
          ? { url: logoObj.url ?? '', id: logoObj.id ?? 0 }
          : null,
        logoWhite: logoWhiteObj && typeof logoWhiteObj === 'object' && logoWhiteObj !== null && 'url' in logoWhiteObj && 'id' in logoWhiteObj
          ? { url: logoWhiteObj.url ?? '', id: logoWhiteObj.id ?? 0 }
          : null,
        businessBrn: (s?.businessBrn as string) ?? defaultSettings.businessBrn,
        vatRegistrationNumber: (s?.vatRegistrationNumber as string) ?? defaultSettings.vatRegistrationNumber,
        invoicePrefix: (s?.invoicePrefix as string) ?? defaultSettings.invoicePrefix,
        taxRateDefault: Number(s?.taxRateDefault) ?? defaultSettings.taxRateDefault,
        currency: (s?.currency as string) ?? defaultSettings.currency,
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
