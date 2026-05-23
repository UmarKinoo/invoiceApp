'use client'

import Link from 'next/link'
import { Bot, Sparkles } from 'lucide-react'
import { BeamsBackground } from './BeamsBackground'

type BeamsSectionProps = {
  /** When false, hero CTA shows "Login"; when true, "Enter dashboard". */
  isLoggedIn?: boolean
}

export function BeamsSection({ isLoggedIn = false }: BeamsSectionProps) {
  return (
    <div className="relative w-full h-screen h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      <BeamsBackground />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-5 sm:space-y-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <img
              src="/swiftbook-icon.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain shrink-0"
              aria-hidden
            />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tighter leading-tight">
              Swiftbook
            </h1>
          </div>
          <p className="text-base sm:text-lg text-white/80 max-w-md mx-auto -mt-0.5">
            Powering modern businesses.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="min-h-[48px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-primary px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 touch-manipulation"
              >
                Enter dashboard
              </Link>
              <Link
                href="/dashboard/agent"
                className="group relative min-h-[48px] inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-white shadow-[0_0_40px_-8px_rgba(255,255,255,0.45)] backdrop-blur-md transition-all hover:border-white/35 hover:bg-white/15 hover:shadow-[0_0_48px_-6px_rgba(255,255,255,0.55)] active:scale-[0.98] touch-manipulation"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-cyan-400/20 opacity-80"
                  aria-hidden
                />
                <Bot className="relative size-5 shrink-0" aria-hidden />
                <span className="relative">Try Swiftbook Agent</span>
                <Sparkles className="relative size-4 shrink-0 text-white/80 transition-transform group-hover:scale-110" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="min-h-[48px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-primary px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 touch-manipulation"
              >
                Login
              </Link>
              <Link
                href="/login?from=/dashboard/agent"
                className="group relative min-h-[48px] inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-6 sm:px-8 py-3.5 sm:py-4 text-center text-sm sm:text-base font-medium text-white shadow-[0_0_40px_-8px_rgba(255,255,255,0.45)] backdrop-blur-md transition-all hover:border-white/35 hover:bg-white/15 hover:shadow-[0_0_48px_-6px_rgba(255,255,255,0.55)] active:scale-[0.98] touch-manipulation"
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-cyan-400/20 opacity-80"
                  aria-hidden
                />
                <Bot className="relative size-5 shrink-0" aria-hidden />
                <span className="relative">Meet your CRM Assistant</span>
                <Sparkles className="relative size-4 shrink-0 text-white/80 transition-transform group-hover:scale-110" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
