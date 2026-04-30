import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'DataSphere Agents',
    template: '%s | DataSphere Agents',
  },
  description: 'AI-Powered SaaS Platform for Building and Managing Intelligent Agents',
  keywords: ['AI', 'agents', 'SaaS', 'automation', 'machine learning', 'conversational AI'],
  authors: [{ name: 'DataSphere Agents' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'DataSphere Agents',
    title: 'DataSphere Agents',
    description: 'AI-Powered SaaS Platform for Building and Managing Intelligent Agents',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DataSphere Agents',
    description: 'AI-Powered SaaS Platform for Building and Managing Intelligent Agents',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  )
}
