'use client'

import { BeamsBackground } from './BeamsBackground'

/** Full-page layout with beam animation behind centered content. */
export function BeamsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-0 min-h-screen min-h-[100dvh] overflow-hidden">
      <BeamsBackground />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
