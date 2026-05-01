import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  organizationId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
