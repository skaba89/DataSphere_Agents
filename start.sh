#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_OPTIONS="--max-old-space-size=4096"

echo "[$(date)] Starting DataSphere Agents server..."

# Auto-seed if needed
echo "[$(date)] Checking database..."
npx prisma db push --skip-generate 2>/dev/null

echo "[$(date)] Starting Next.js..."
while true; do
  npx next dev -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
