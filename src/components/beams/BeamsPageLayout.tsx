'use client'

import { BeamsBackground } from './BeamsBackground'

/** Full-page layout with beam animation behind centered content. Mobile-friendly: safe area, scroll, generous padding. */
export function BeamsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-0 min-h-screen min-h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-y-none">
      <BeamsBackground />
      <div
        className="relative z-10 flex min-h-full min-h-[100dvh] w-full items-center justify-center pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 md:p-8"
      >
        {children}
      </div>
    </div>
  )
}
