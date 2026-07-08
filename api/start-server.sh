#!/bin/bash
cd "$(dirname "$0")"
export PORT=5002
trap '' HUP INT TERM
node dist/server.js > server.log 2>&1 &
echo $! > server.pid
sleep 2
curl -s --max-time 3 http://192.168.2.201:5002/health
echo "Server started with PID $(cat server.pid)"
