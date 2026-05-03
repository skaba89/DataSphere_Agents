#!/bin/bash
cd /home/z/my-project
ATTEMPT=0
while [ $ATTEMPT -lt 100 ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "[$(date)] Starting server (attempt $ATTEMPT)..."
  node node_modules/.bin/next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE"
  sleep 2
done
echo "Max restart attempts reached"
