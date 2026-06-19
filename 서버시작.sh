#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=18080
FRONTEND_PORT=15173

export SERVER_PORT=$BACKEND_PORT
export VITE_BACKEND_URL="http://localhost:$BACKEND_PORT"
export VITE_FRONTEND_PORT=$FRONTEND_PORT
export APP_CORS_ALLOWED_ORIGINS="http://localhost:$FRONTEND_PORT"

echo "========================================"
echo "  BVIIT Analytics Dashboard - Start"
echo "========================================"

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[port $port] killing: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

BOOT_PROFILE=""
if [ -f "$PROJECT_DIR/backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/backend/.env"
  set +a
  echo "[ENV] .env loaded"
  BOOT_PROFILE="mssql"
fi

echo "[Backend]  http://localhost:$BACKEND_PORT"
echo "[Frontend] http://localhost:$FRONTEND_PORT"
echo "[Login]    admin / 1234"
echo "========================================"

mkdir -p "$PROJECT_DIR/logs"
BACKEND_LOG="$PROJECT_DIR/logs/backend.log"
: > "$BACKEND_LOG"

cd "$PROJECT_DIR/backend"
if [ -n "$BOOT_PROFILE" ]; then
  nohup ./gradlew bootRun --args="--spring.profiles.active=$BOOT_PROFILE" \
    > "$BACKEND_LOG" 2>&1 &
else
  nohup ./gradlew bootRun > "$BACKEND_LOG" 2>&1 &
fi
BACKEND_PID=$!
echo "[Backend] PID $BACKEND_PID (log: $BACKEND_LOG)"

echo -n "[Backend] 준비 대기"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:$BACKEND_PORT/actuator/health" 2>/dev/null \
     || curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/" 2>/dev/null | grep -qE "^[2-4]"; then
    echo " → OK"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo " → 백엔드 프로세스 종료됨. 로그 확인: $BACKEND_LOG"
    exit 1
  fi
  echo -n "."
  sleep 1
done

cleanup() {
  echo ""
  echo "[Shutdown] stopping backend (PID $BACKEND_PID)"
  kill "$BACKEND_PID" 2>/dev/null || true
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"
}
trap cleanup EXIT INT TERM

cd "$PROJECT_DIR/frontend"
if [ ! -d node_modules ]; then
  echo "[Frontend] node_modules 없음 → npm install 실행"
  npm install
fi
npm run dev
