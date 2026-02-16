import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuoteForm } from '../../quote-form'

export default function NewQuotePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard/quotes"
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white btn-press"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">New Quote</h2>
          <p className="text-slate-500 text-sm">Create a new quote.</p>
        </div>
      </header>
      <QuoteForm />
    </div>
  )
}
