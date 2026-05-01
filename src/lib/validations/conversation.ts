import { z } from 'zod'

export const createConversationSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID'),
  title: z.string().max(200, 'Title is too long').optional(),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
