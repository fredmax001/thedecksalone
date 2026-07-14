#!/bin/bash
cd "$(dirname "$0")"
export PORT=5002
export NODE_ENV=production
nohup node dist/server.js > server.log 2>&1 < /dev/null &
echo $! > server.pid
sleep 2
curl -s --max-time 3 http://127.0.0.1:5002/health
echo "Server started with PID $(cat server.pid)"
