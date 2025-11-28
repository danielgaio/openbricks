import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpenBricks Studio',
  description: 'Open-source data platform dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
