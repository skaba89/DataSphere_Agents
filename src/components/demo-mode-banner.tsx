'use client'

import { useState, useEffect } from 'react'
import { Database, X, Info } from 'lucide-react'

export function DemoModeBanner() {
  const [isDemo, setIsDemo] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setIsDemo(data.database === 'demo-mode')
      })
      .catch(() => {})
  }, [])

  if (!isDemo || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm">
        <Database className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          Demo Mode
        </span>
        <span className="text-sm text-amber-600 dark:text-amber-400">
          — Data stored in memory
        </span>
        <div className="relative group">
          <Info className="h-4 w-4 text-amber-500 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Demo Mode Active</p>
            <p>The application is running without a database connection. All data is stored in memory and will be lost on restart. To connect a real database, set the <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">DATABASE_URL</code> environment variable.</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
