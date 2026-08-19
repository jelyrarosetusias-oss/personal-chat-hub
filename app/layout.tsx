import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: '⍙⌖⍜⌰⏃⍀⟟⌇',
  description: '⌿⍀⍜⏁⍜☊⍜⌰ ⏁⍀⏃⋏⌇⋔⟟⌇⌇⟟⍜⋏',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#ffffff'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-[#f8fafb] text-[#1f1f1f] antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
