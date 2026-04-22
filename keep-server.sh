#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next start -p 3000 2>&1
  echo "[$(date)] Server crashed, restarting in 3s..."
  sleep 3
done
