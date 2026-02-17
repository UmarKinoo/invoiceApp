import '@/globals.css'

import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'

import { cn } from '@/lib/utils'

import type { Metadata, Viewport } from 'next'

// System font stack: San Francisco on Apple, Segoe UI on Windows, Roboto on Android
const fontSansClassName = 'font-sans'

export const metadata: Metadata = {
  title: 'Swiftbook',
  description: 'Invoices, contacts, and CRM in one place. Manage clients, quotes, invoices, tasks, and transactions.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    siteName: 'Swiftbook',
    title: 'Swiftbook',
    description: 'Invoices, contacts, and CRM in one place.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swiftbook',
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
      className={cn('dark', fontSansClassName, GeistMono.variable, 'antialiased')}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={cn('flex flex-col min-h-screen', fontSansClassName)}>
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
