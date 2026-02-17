import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const AuthBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full max-w-full sm:max-w-[22rem] sm:mx-auto space-y-4">
      <div className="w-full min-w-0 p-5 sm:p-6 border rounded-lg sm:rounded-md bg-background shadow-sm">{children}</div>
      <Link
        className="min-h-[44px] text-sm sm:text-xs text-muted-foreground flex items-center gap-2 py-3 -mb-2 active:opacity-70"
        href="/"
      >
        <ArrowLeft size={16} className="shrink-0" /> Back to home
      </Link>
    </div>
  )
}
