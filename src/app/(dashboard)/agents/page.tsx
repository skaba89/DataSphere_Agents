'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Plus,
  Search,
  LayoutGrid,
  List,
  MessageSquare,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Agent {
  id: string
  name: string
  description?: string
  model: string
  isActive: boolean
  provider?: { id: string; name: string; type: string }
  _count?: { conversations: number }
  createdAt: string
}

interface CreateAgentForm {
  name: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
}

interface FormErrors {
  name?: string
  maxTokens?: string
}

const GRADIENT_ACCENTS = [
  'from-emerald-500 to-teal-400',
  'from-violet-500 to-purple-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-cyan-500 to-sky-400',
  'from-fuchsia-500 to-pink-400',
]

function getModelBadgeInfo(model: string) {
  const lower = model.toLowerCase()
  if (lower.includes('gpt')) return { label: 'GPT', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
  if (lower.includes('claude')) return { label: 'Claude', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }
  return { label: 'AI', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' }
}

function getGradientForAgent(index: number) {
  return GRADIENT_ACCENTS[index % GRADIENT_ACCENTS.length]
}

// ─── Create Agent Modal ────────────────────────────────────────────────────────

function CreateAgentModal({
  open,
  onClose,
  onCreate,
  isCreating,
}: {
  open: boolean
  onClose: () => void
  onCreate: (form: CreateAgentForm) => Promise<void>
  isCreating: boolean
}) {
  const [form, setForm] = useState<CreateAgentForm>(() => ({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
  }))
  const [errors, setErrors] = useState<FormErrors>({})

  // Reset form when modal opens by re-keying the component from parent
  // (handled by AnimatePresence remount)

  const validate = useCallback(() => {
    const newErrors: FormErrors = {}
    if (!form.name.trim()) newErrors.name = 'Agent name is required'
    if (form.maxTokens < 1 || form.maxTokens > 128000) newErrors.maxTokens = 'Must be between 1 and 128,000'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form.name, form.maxTokens])

  const handleSubmit = async () => {
    if (!validate()) return
    await onCreate(form)
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isCreating) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Create New Agent</h2>
                  <p className="text-sm text-muted-foreground">Configure your AI agent</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isCreating}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="agent-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., Customer Support Bot"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    if (errors.name) setErrors({ ...errors, name: undefined })
                  }}
                  aria-invalid={!!errors.name}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Input
                  id="agent-desc"
                  placeholder="Brief description of what this agent does"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="agent-system-prompt">System Prompt</Label>
                <Textarea
                  id="agent-system-prompt"
                  placeholder="Instructions that define how the agent behaves..."
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="min-h-24 resize-y"
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={form.model}
                  onValueChange={(value) => setForm({ ...form, model: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {form.temperature.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[form.temperature]}
                  onValueChange={([value]) => setForm({ ...form, temperature: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label htmlFor="agent-max-tokens">Max Tokens</Label>
                <Input
                  id="agent-max-tokens"
                  type="number"
                  min={1}
                  max={128000}
                  value={form.maxTokens}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setForm({ ...form, maxTokens: val })
                    if (errors.maxTokens) setErrors({ ...errors, maxTokens: undefined })
                  }}
                  aria-invalid={!!errors.maxTokens}
                  className={errors.maxTokens ? 'border-destructive' : ''}
                />
                {errors.maxTokens && (
                  <p className="text-sm text-destructive">{errors.maxTokens}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isCreating || !form.name.trim()}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Agent
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const gradient = getGradientForAgent(index)
  const modelBadge = getModelBadgeInfo(agent.model)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
    >
      <Link
        href={`/agents/${agent.id}`}
        className="group relative flex rounded-xl border border-border bg-card overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Gradient accent on the left */}
        <div className={`w-1.5 shrink-0 bg-gradient-to-b ${gradient}`} />

        <div className="flex-1 p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Bot className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{agent.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {agent.provider?.name || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Status indicator with pulsing dot */}
            <div className="flex items-center gap-1.5">
              <span
                className={`relative flex h-2.5 w-2.5 ${agent.isActive ? '' : ''}`}
              >
                {agent.isActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    agent.isActive
                      ? 'bg-green-500'
                      : 'bg-gray-400 dark:bg-gray-500'
                  }`}
                />
              </span>
              <span
                className={`text-xs font-medium ${
                  agent.isActive
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {agent.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Description (truncated to 2 lines) */}
          {agent.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          )}

          {/* Model badge + meta */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 font-semibold border-0 ${modelBadge.className}`}>
              {modelBadge.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{agent.model}</span>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{agent._count?.conversations || 0} conversations</span>
            <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Chat quick-action button (visible on hover) */}
          <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:opacity-90 transition-opacity">
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
      >
        <Bot className="w-10 h-10 text-primary" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Create your first AI agent to start building intelligent conversations. Agents can be configured with different models and personalities.
      </p>
      <button
        onClick={onCreateClick}
        className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        <Plus className="w-4 h-4" />
        Create Your First Agent
      </button>
    </motion.div>
  )
}

function FilteredEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-2">No matching agents</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        No agents match the current filter. Try adjusting your search or filter criteria.
      </p>
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [modalOpen, setModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [providerId, setProviderId] = useState<string | null>(null)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const userRes = await fetch('/api/users/me', { credentials: 'include' })
        const userData = await userRes.json()

        if (userData.success && userData.data?.organizations?.length > 0) {
          const firstOrg = userData.data.organizations[0]
          const firstOrgId = firstOrg.id || firstOrg.organization?.id
          setOrgId(firstOrgId)

          const agentsRes = await fetch(`/api/agents?organizationId=${firstOrgId}`, { credentials: 'include' })
          const agentsData = await agentsRes.json()
          if (agentsData.success && agentsData.data?.length > 0 && agentsData.data[0].provider?.id) {
            setProviderId(agentsData.data[0].provider.id)
          }

          await fetchAgents(firstOrgId)
        } else {
          setLoading(false)
        }
      } catch {
        setError('Failed to load data')
        setLoading(false)
      }
    }

    const fetchAgents = async (organizationId: string) => {
      try {
        const res = await fetch(`/api/agents?organizationId=${organizationId}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setAgents(data.data || [])
        } else {
          setError(data.error?.message || 'Failed to load agents')
        }
      } catch {
        setError('Failed to load agents')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  const filteredAgents = agents.filter((agent) => {
    const matchesFilter =
      filter === 'all' ? true : filter === 'active' ? agent.isActive : !agent.isActive
    const matchesSearch =
      searchQuery.trim() === '' ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleCreateAgent = async (form: CreateAgentForm) => {
    if (!orgId) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          systemPrompt: form.systemPrompt || undefined,
          organizationId: orgId,
          providerId: providerId || 'default',
          model: form.model,
          temperature: form.temperature,
          maxTokens: form.maxTokens,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setModalOpen(false)
        router.push(`/agents/${data.data.id}`)
      } else {
        setError(data.error?.message || 'Failed to create agent')
      }
    } catch {
      setError('Failed to create agent')
    } finally {
      setIsCreating(false)
    }
  }

  const openCreateModal = () => {
    if (!orgId) return
    setModalOpen(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage your AI agents</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!orgId}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Search, Filters, and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                filter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 text-xs opacity-60">
                {f === 'all'
                  ? agents.length
                  : agents.filter((a) => (f === 'active' ? a.isActive : !a.isActive)).length}
              </span>
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {filteredAgents.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
              {filteredAgents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <EmptyState onCreateClick={openCreateModal} />
          ) : (
            <FilteredEmptyState />
          )}
        </>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateAgent}
        isCreating={isCreating}
      />
    </div>
  )
}
