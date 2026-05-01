import { z } from 'zod'

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  model: z.string().min(1, 'Model is required').max(100, 'Model name is too long'),
  systemPrompt: z.string().max(10000, 'System prompt is too long').optional(),
  temperature: z.number().min(0, 'Temperature must be >= 0').max(2, 'Temperature must be <= 2').optional(),
  maxTokens: z.number().int().min(1, 'Max tokens must be >= 1').max(128000, 'Max tokens too high').optional(),
  welcomeMessage: z.string().max(1000, 'Welcome message is too long').optional(),
})

export const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  systemPrompt: z.string().max(10000, 'System prompt is too long').optional(),
  model: z.string().min(1, 'Model is required').max(100, 'Model name is too long').optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  isActive: z.boolean().optional(),
  welcomeMessage: z.string().max(1000, 'Welcome message is too long').optional(),
})

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(50000, 'Message is too long'),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>
