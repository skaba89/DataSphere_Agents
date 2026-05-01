#!/usr/bin/env tsx
/**
 * DataSphere Agents - Prisma Migration Script
 * Used by Render's migration service to run database migrations
 * 
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate.ts
 */

import { execSync } from 'child_process'

function run(command: string, label: string) {
  console.log(`\n🔄 Running: ${label}`)
  console.log(`   Command: ${command}`)
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })
    console.log(output)
    console.log(`✅ ${label} completed successfully`)
  } catch (error: any) {
    console.error(`❌ ${label} failed:`)
    console.error(error.stdout || '')
    console.error(error.stderr || '')
    process.exit(1)
  }
}

console.log('🚀 DataSphere Agents - Database Migration')
console.log('=========================================')
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Missing DATABASE_URL'}`)

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

// Step 1: Generate Prisma Client
run('npx prisma generate', 'Prisma Client Generation')

// Step 2: Deploy migrations
run('npx prisma migrate deploy', 'Database Migration')

console.log('\n✨ Migration complete! Database is ready.')
