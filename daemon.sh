#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_OPTIONS="--max-old-space-size=4096"
# Disconnect from controlling terminal
exec 0</dev/null 1>/home/z/my-project/daemon.log 2>&1
# Become session leader
setsid npx next dev -p 3000 &
CHILD_PID=$!
echo "Child PID: $CHILD_PID" >> /home/z/my-project/daemon.log
# Wait forever
wait
