import { LogoutButton } from '@/components/auth/logout-button'
import { Button } from '@/components/ui/button'
import { Nav } from '@/components/ds'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import type { User } from '@/payload-types'

export const Header = async () => {
  const user: User | null = await getUser()

  return (
    <Nav
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      containerClassName="flex items-center justify-between gap-4"
    >
      <Link href="/" className="text-foreground">
        <span className="text-lg font-semibold tracking-tight">Swiftbook</span>
      </Link>

      <nav className="flex items-center gap-2">
        {user ? (
          <>
            <LogoutButton />
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </nav>
    </Nav>
  )
}
