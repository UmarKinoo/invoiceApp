'use client'

import Link from 'next/link'
import { BeamsBackground } from './BeamsBackground'

type BeamsSectionProps = {
  /** When false, hero CTA shows "Login"; when true, "Enter dashboard". */
  isLoggedIn?: boolean
}

export function BeamsSection({ isLoggedIn = false }: BeamsSectionProps) {
  return (
    <div className="relative w-full min-h-screen min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      <BeamsBackground />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-5 sm:space-y-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-2 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tighter leading-tight">
            Swiftbook
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-md mx-auto">
            Invoicing and client management, simplified.
          </p>
        </div>
        <div className="flex justify-center pt-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="min-h-[48px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-primary px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 touch-manipulation"
            >
              Enter dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="min-h-[48px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-primary px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 touch-manipulation"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
