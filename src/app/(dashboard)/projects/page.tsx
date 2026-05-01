'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderKanban, Plus } from 'lucide-react'
import { api } from '@/lib/api-client'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrgs = async () => {
      const res = await api.getOrganizations()
      if (res.success && res.data) {
        const orgs = res.data as Organization[]
        setOrganizations(orgs)
        if (orgs.length > 0) setCurrentOrg(orgs[0].id)
      }
    }
    fetchOrgs()
  }, [])

  useEffect(() => {
    if (!currentOrg) return
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const res = await api.getProjects(currentOrg)
        if (res.success && res.data) {
          setProjects(res.data as Project[])
        }
      } catch {
        // Error handled
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [currentOrg])

  const filtered = projects.filter((p) => {
    if (filter === 'all') return true
    return p.status === filter.toUpperCase()
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Organize your agents into projects</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'archived'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-4">Create a project to organize your agents</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{project.name}</h3>
                      <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground shrink-0">
                    <p>Created {new Date(project.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
