#!/bin/bash
while true; do
  echo "Starting Next.js dev server..."
  npx next dev -p 3000 --hostname 0.0.0.0 2>&1
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
