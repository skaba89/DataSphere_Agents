import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(1).optional(),
  STRIPE_PUBLIC_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('DataSphere Agents'),
  REDIS_URL: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

// Only parse on server side
function getEnv(): Partial<Env> {
  if (typeof window !== 'undefined') {
    return {
      NODE_ENV: process.env.NODE_ENV as Env['NODE_ENV'],
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'DataSphere Agents',
    }
  }

  try {
    return envSchema.parse(process.env)
  } catch {
    // In development, return partial env instead of crashing
    if (process.env.NODE_ENV === 'development') {
      return {
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_NAME: 'DataSphere Agents',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/datasphere_agents',
      } as Partial<Env>
    }
    throw new Error('Invalid environment variables')
  }
}

export const env = getEnv()
