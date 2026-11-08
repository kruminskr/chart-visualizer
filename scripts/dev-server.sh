#!/usr/bin/env bash
# Manage a background Next.js dev server for previews/screenshots.
#   scripts/dev-server.sh start|stop|status|logs
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
LOG=.dev-server.log
PIDFILE=.dev-server.pid
URL="http://localhost:$PORT/api/health"

up() { curl -sf "$URL" >/dev/null 2>&1; }

case "${1:-start}" in
  start)
    if up; then echo "dev server already running on :$PORT"; exit 0; fi
    nohup npx next dev -p "$PORT" > "$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    for _ in $(seq 1 120); do up && { echo "dev server ready: http://localhost:$PORT (logs: $LOG)"; exit 0; }; sleep 0.5; done
    echo "dev server failed to start — tail of $LOG:"; tail -30 "$LOG"; exit 1 ;;
  stop)
    [ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" 2>/dev/null || true
    pkill -f "next dev -p $PORT" 2>/dev/null || true
    rm -f "$PIDFILE"; echo "stopped" ;;
  status) up && echo "running on :$PORT" || { echo "not running"; exit 1; } ;;
  logs) tail -n "${2:-50}" "$LOG" ;;
  *) echo "usage: $0 start|stop|status|logs [n]"; exit 2 ;;
esac
