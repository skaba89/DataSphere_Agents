#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_OPTIONS="--max-old-space-size=4096"
while true; do
  npx next dev -p 3000
  echo "[$(date)] Restarting..." >> /tmp/daemon.log
  sleep 3
done
