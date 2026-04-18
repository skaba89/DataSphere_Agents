#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=4096"

echo "[$(date)] Starting DataSphere Agents server..."
while true; do
  npx next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
