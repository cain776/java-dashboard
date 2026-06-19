#!/usr/bin/env bash

BACKEND_PORT=18080
FRONTEND_PORT=15173

echo "========================================"
echo "  BVIIT Analytics Dashboard - Shutdown"
echo "========================================"

FOUND=0
kill_port() {
  local label=$1
  local port=$2
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[$label :$port] killing PIDs: $pids"
    kill -9 $pids 2>/dev/null || true
    FOUND=1
  fi
}

kill_port "Backend" "$BACKEND_PORT"
kill_port "Frontend" "$FRONTEND_PORT"

if [ $FOUND -eq 0 ]; then
  echo "No running server found."
else
  echo ""
  echo "All servers stopped."
fi
echo "========================================"
