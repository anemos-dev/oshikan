#!/bin/zsh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
PORT=8765

if ! lsof -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 -m http.server "${PORT}" >"${SCRIPT_DIR}/server.log" 2>&1 &
fi

open "http://localhost:${PORT}/index.html"
