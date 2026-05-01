import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  organizationId: z.string().uuid().optional(),
})

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug is too long').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
