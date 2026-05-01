# DataSphere Agents - Deployment Guide

## Architecture Overview

| Component | Platform | Purpose |
|-----------|----------|---------|
| Frontend + API | Netlify | Next.js SSR pages, API routes, static assets |
| Database | Render | Managed PostgreSQL 15 |
| CI/CD | GitHub Actions | Lint, test, build, deploy |

## Prerequisites

- [Netlify](https://netlify.com) account
- [Render](https://render.com) account
- [GitHub](https://github.com) repository
- Node.js 20+
- npm 9+

---

## Step 1: Set Up PostgreSQL on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `datasphere-agents-db`
   - **Database**: `datasphere_agents`
   - **User**: `datasphere`
   - **Plan**: Starter ($7/month)
   - **Region**: Choose closest to your users
4. Click **Create Database**
5. Copy the **Internal Database URL** — you'll need this for Netlify

### Alternative: Using render.yaml Blueprint

1. Push your code to GitHub
2. Go to Render Dashboard → **New** → **Blueprint**
3. Connect your repository
4. Render will detect `render.yaml` and create resources automatically

---

## Step 2: Deploy to Netlify

### Option A: Connect via Git (Recommended)

1. Push your code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com)
3. Click **Add new site** → **Import an existing project**
4. Connect your GitHub repository
5. Configure build settings:
   - **Build command**: `npx prisma generate && npm run build`
   - **Publish directory**: `.next`
6. The `netlify.toml` file will be automatically detected

### Option B: Manual Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

### Set Environment Variables on Netlify

Go to **Site settings** → **Environment variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Render External Database URL | Use external URL (not internal) |
| `NEXTAUTH_SECRET` | Random 32+ char string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-site.netlify.app` | Your Netlify URL |
| `JWT_SECRET` | Random 32+ char string | `openssl rand -base64 32` |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` or `pk_live_...` | Optional |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Optional |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Optional |
| `NODE_ENV` | `production` | |

> **Important**: Use the **External** Database URL from Render (not the Internal one) because Netlify functions run outside Render's network.

---

## Step 3: Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Webhooks**
2. Click **Add endpoint**
3. Set URL: `https://your-site.netlify.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add as `STRIPE_WEBHOOK_SECRET` on Netlify

---

## Step 4: Configure GitHub Actions

### Required Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret | Description |
|--------|-------------|
| `NETLIFY_AUTH_TOKEN` | Personal access token from Netlify |
| `NETLIFY_SITE_ID` | Your Netlify site ID |
| `DATABASE_URL` | Render database URL (for CI) |
| `NEXTAUTH_SECRET` | Auth secret |
| `JWT_SECRET` | JWT secret |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL (optional) |

### Getting Netlify Tokens

1. Go to Netlify → **User settings** → **Applications** → **Personal access tokens**
2. Generate a new token
3. Find your Site ID in **Site settings** → **General** → **Site details**

---

## Step 5: Run Database Migrations

After your first deployment, run Prisma migrations against the production database:

```bash
# Set DATABASE_URL to Render's external URL
export DATABASE_URL="postgresql://datasphere:password@host.render.com/datasphere_agents"

# Push schema
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

---

## Step 6: Verify Deployment

### Health Check

```bash
curl https://your-site.netlify.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "service": "DataSphere Agents API",
  "version": "1.0.0",
  "uptime": 123.456,
  "environment": "production"
}
```

### Database Connection

```bash
# Using Prisma Studio
DATABASE_URL="your-render-url" npx prisma studio
```

---

## Local Development

### Using Docker Compose

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start development server
npm run dev
```

### Without Docker

You need PostgreSQL and optionally Redis installed locally.

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your local database URL
# DATABASE_URL=postgresql://user:password@localhost:5432/datasphere_agents

# Install and setup
npm install
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

---

## Troubleshooting

### Build Failures on Netlify

1. Check build logs in Netlify dashboard
2. Ensure all environment variables are set
3. Verify `DATABASE_URL` uses the external Render URL
4. Check Node.js version matches (20)

### Database Connection Issues

1. Ensure you're using the **External** database URL from Render
2. Check Render database is active (not suspended)
3. Verify IP allow list is empty (allows all connections)

### Prisma Client Issues

1. Ensure `npx prisma generate` runs during build
2. Check `postinstall` script in package.json
3. Verify `@prisma/client` and `prisma` versions match

### API Route Issues

1. The `@netlify/plugin-nextjs` handles SSR and API routes
2. Check function logs in Netlify dashboard
3. Verify CORS headers in `netlify.toml`

---

## Cost Estimate

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Netlify | Pro | $19/month |
| Render PostgreSQL | Starter | $7/month |
| **Total** | | **~$26/month** |

### Free Tier Alternative

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Netlify | Free | $0 (100GB bandwidth, 300 build min) |
| Render PostgreSQL | Free | $0 (expires after 90 days) |
| **Total** | | **$0/month** |

> Note: Render free PostgreSQL databases expire after 90 days. Use for development only.

---

## Monitoring

- **Netlify**: Built-in analytics, function logs, deploy notifications
- **Render**: Database metrics, connection pooling stats
- **Application**: `/api/health` endpoint for uptime monitoring

---

## Rollback

### Netlify

1. Go to **Deploys** tab
2. Find the last working deploy
3. Click **Promote to production**

### Render Database

1. Use Render's built-in backup/restore
2. Or restore from `pg_dump` backup

---

## Security Checklist

- [ ] All secrets stored in environment variables (not code)
- [ ] `NEXTAUTH_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] Stripe webhook signature verification enabled
- [ ] CORS headers properly configured
- [ ] Security headers set in netlify.toml
- [ ] Database SSL enabled (Render default)
- [ ] Rate limiting enabled in middleware
- [ ] 2FA/TOTP available for user accounts
