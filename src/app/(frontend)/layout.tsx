import '@/globals.css'

import { Geist as FontSans } from 'next/font/google'
import { Geist_Mono as FontMono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'

import { cn } from '@/lib/utils'

import type { Metadata, Viewport } from 'next'

const fontSans = FontSans({
  subsets: ['latin'],
})

const fontMono = FontMono({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Invoice',
  description: 'Invoices, contacts, and CRM in one place. Manage clients, quotes, invoices, tasks, and transactions.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    siteName: 'Invoice',
    title: 'Invoice',
    description: 'Invoices, contacts, and CRM in one place.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Invoice',
    description: 'Invoices, contacts, and CRM in one place.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${fontSans.className} ${fontMono.className} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={cn('flex flex-col min-h-screen', fontSans.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors expand={true} closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
