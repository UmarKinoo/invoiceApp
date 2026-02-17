import { Header } from '@/components/site/header'
import { Main } from '@/components/ds'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Main className="min-h-screen min-h-[100dvh]">{children}</Main>
    </>
  )
}
