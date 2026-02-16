import Link from 'next/link'
import { Container, Section } from '@/components/ds'

export default async function Home() {
  return (
    <Section className="min-h-[70vh] flex flex-col justify-center">
      <Container className="space-y-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
          Invoices, contacts, and CRM in one place
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage clients, send quotes and invoices, track tasks and transactions. Simple and focused.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-primary px-8 py-4 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 glass rounded-2xl text-white font-bold text-center btn-press border border-white/10 hover:bg-white/5 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </Container>
    </Section>
  )
}
