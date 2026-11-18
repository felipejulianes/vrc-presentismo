import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DomainMovedBanner } from '@/components/layout/DomainMovedBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Virreyes Rugby Club',
  description: 'Sistema de presentismo — Virreyes Rugby Club',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VRC',
  },
}

export const viewport: Viewport = {
  themeColor: '#2b7a2b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DomainMovedBanner />
        {children}
      </body>
    </html>
  )
}
