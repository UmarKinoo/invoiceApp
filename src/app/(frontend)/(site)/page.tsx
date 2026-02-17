import { BeamsSection } from '@/components/beams/BeamsSection'
import { getUser } from '@/lib/auth'

export default async function Home() {
  const user = await getUser()
  return <BeamsSection isLoggedIn={!!user} />
}
