'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

import { clearAuthCookies } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export const LogoutButton = ({ className }: { className?: string }) => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)

    try {
      const result = await clearAuthCookies()

      if (result.success) {
        toast.success('Logged out successfully', {
          description: 'You have been signed out of your account.',
        })
        router.push('/')
        router.refresh() // Refresh to clear any cached user state
      } else {
        toast.error('Logout failed', {
          description: 'Please try again.',
        })
      }
    } catch (_error) {
      toast.error('Logout failed', {
        description: 'Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoading} className={cn(className)}>
      <LogOut className="size-4 shrink-0" aria-hidden />
      {isLoading ? 'Signing out...' : 'Log out'}
    </Button>
  )
}

export const LogoutIconButton = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const result = await clearAuthCookies()
      if (result.success) {
        router.push('/')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={handleLogout} disabled={isLoading} title="Log out">
      <LogOut className="size-4" aria-hidden />
    </Button>
  )
}
