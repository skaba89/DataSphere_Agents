'use client'

import { useState } from 'react'

const mockProjects = [
  { id: '1', name: 'Customer Support Platform', description: 'AI-powered customer support system', agents: 3, status: 'active', createdAt: 'Jan 15, 2024' },
  { id: '2', name: 'Sales Intelligence', description: 'Automated lead qualification and outreach', agents: 2, status: 'active', createdAt: 'Feb 3, 2024' },
  { id: '3', name: 'Data Pipeline', description: 'ETL automation and data quality monitoring', agents: 1, status: 'archived', createdAt: 'Dec 10, 2023' },
]

export default function ProjectsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all')

  const filtered = mockProjects.filter((p) => {
    if (filter === 'all') return true
    return p.status === filter
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Organize your agents into projects</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
          + Create Project
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((project) => (
          <div key={project.id} className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{project.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground shrink-0">
                <p>{project.agents} agents</p>
                <p className="text-xs mt-1">Created {project.createdAt}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found</p>
        </div>
      )}
    </div>
  )
}
