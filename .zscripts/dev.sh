#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun not found, using npm..."
  npm install
  npm run dev &
else
  bun install
  bun run dev &
fi

DEV_PID=$!
echo "Dev server starting (PID: $DEV_PID)..."

# Wait for server
for i in $(seq 1 60); do
  if curl -s --connect-timeout 2 http://localhost:3000 >/dev/null 2>&1; then
    echo "Dev server ready at http://localhost:3000"
    break
  fi
  sleep 1
done

disown "$DEV_PID" 2>/dev/null || true
