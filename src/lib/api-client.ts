'use client'

import { verifyToken } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || ''

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {}
    
    // Get token from cookie
    const cookies = document.cookie.split(';')
    const accessToken = cookies.find(c => c.trim().startsWith('access-token='))
      ?.split('=')[1]

    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const url = `${API_BASE}${path}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        // Retry with new token
        const retryHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        }
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        })
        return retryResponse.json()
      }
    }

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(response.status, data.error?.message || 'API Error', data.error?.code, data.error?.details)
    }

    return data
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.fetch<{ success: boolean; data: { user: unknown; tokens: { accessToken: string; refreshToken: string } } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(data: { name?: string; email: string; password: string; confirmPassword: string }) {
    return this.fetch<{ success: boolean; data: { user: unknown; tokens: { accessToken: string; refreshToken: string } } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logout() {
    return this.fetch<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    })
  }

  async forgotPassword(email: string) {
    return this.fetch<{ success: boolean; data: { message: string } }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, password: string, confirmPassword: string) {
    return this.fetch<{ success: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    })
  }

  async verifyEmail(token: string) {
    return this.fetch<{ success: boolean }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  // User
  async getMe() {
    return this.fetch<{ success: boolean; data: unknown }>('/api/users/me')
  }

  async updateProfile(data: { name?: string; email?: string; avatar?: string }) {
    return this.fetch<{ success: boolean; data: unknown }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.fetch<{ success: boolean }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })
  }

  // Agents
  async getAgents(organizationId: string) {
    return this.fetch<{ success: boolean; data: unknown[] }>(`/api/agents?organizationId=${organizationId}`)
  }

  async getAgent(id: string) {
    return this.fetch<{ success: boolean; data: unknown }>(`/api/agents/${id}`)
  }

  async createAgent(data: unknown) {
    return this.fetch<{ success: boolean; data: unknown }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAgent(id: string, data: unknown) {
    return this.fetch<{ success: boolean; data: unknown }>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAgent(id: string) {
    return this.fetch<{ success: boolean }>(`/api/agents/${id}`, {
      method: 'DELETE',
    })
  }

  // Conversations
  async getConversations(params?: { agentId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.agentId) searchParams.set('agentId', params.agentId)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    return this.fetch<{ success: boolean; data: unknown[]; pagination: unknown }>(`/api/conversations?${searchParams}`)
  }

  async getConversation(id: string) {
    return this.fetch<{ success: boolean; data: unknown }>(`/api/conversations/${id}`)
  }

  async createConversation(agentId: string, title?: string) {
    return this.fetch<{ success: boolean; data: unknown }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ agentId, title }),
    })
  }

  async deleteConversation(id: string) {
    return this.fetch<{ success: boolean }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    })
  }

  // Organizations
  async getOrganizations() {
    return this.fetch<{ success: boolean; data: unknown[] }>('/api/organizations')
  }

  async createOrganization(name: string, slug: string) {
    return this.fetch<{ success: boolean; data: unknown }>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    })
  }

  // Projects
  async getProjects(organizationId: string) {
    return this.fetch<{ success: boolean; data: unknown[] }>(`/api/projects?organizationId=${organizationId}`)
  }

  async createProject(data: { name: string; description?: string; organizationId: string }) {
    return this.fetch<{ success: boolean; data: unknown }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Notifications
  async getNotifications(unreadOnly = false) {
    return this.fetch<{ success: boolean; data: unknown[]; meta: { unreadCount: number } }>(`/api/notifications${unreadOnly ? '?unread=true' : ''}`)
  }

  async markNotificationsRead(ids?: string[]) {
    return this.fetch<{ success: boolean }>('/api/notifications', {
      method: 'PUT',
      body: JSON.stringify(ids ? { notificationIds: ids } : { markAll: true }),
    })
  }

  // Subscriptions
  async getSubscriptions(organizationId?: string) {
    const params = organizationId ? `?organizationId=${organizationId}` : ''
    return this.fetch<{ success: boolean; data: unknown[] }>(`/api/subscriptions${params}`)
  }

  async createSubscription(priceId: string, organizationId?: string) {
    return this.fetch<{ success: boolean; data: { checkoutUrl: string } }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ priceId, organizationId }),
    })
  }

  async getPlans() {
    return this.fetch<{ success: boolean; data: unknown[] }>('/api/subscriptions/plans')
  }

  async createPortalSession(customerId: string) {
    return this.fetch<{ success: boolean; data: { url: string } }>('/api/subscriptions/portal', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    })
  }

  // Chat (SSE)
  chat(agentId: string, content: string, conversationId?: string): EventSource | null {
    return null // SSE handled directly in components
  }
}

class ApiError extends Error {
  status: number
  code?: string
  details?: Record<string, string[]>

  constructor(status: number, message: string, code?: string, details?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const api = new ApiClient()
export { ApiError }
