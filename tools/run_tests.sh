#!/bin/bash
# 日常測試：邏輯測試加仍然有效的瀏覽器測試。需要 playwright 與 chromium。
set -eo pipefail
cd "$(dirname "$0")/.."
for t in grid expansion mechanics progression gameplay ux; do node tools/test_$t.js | tail -1; done
for f in equipment_fit intro_logo phone_natural release_043 support wire_touch; do
  port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
  python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 & srv=$!
  trap 'kill "$srv" 2>/dev/null || true' EXIT
  sleep 1
  GAME_TEST_BASE="http://127.0.0.1:$port" node tools/test_${f}_browser.cjs | tail -1
  kill "$srv" 2>/dev/null || true
  wait "$srv" 2>/dev/null || true
  trap - EXIT
done
node tools/test_site_boot.cjs | tail -1
echo "全部通過"
