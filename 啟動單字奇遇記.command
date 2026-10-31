#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  node server-v2.mjs
else
  for game_node in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [[ -x "$game_node" ]]; then
      "$game_node" server-v2.mjs
      exit $?
    fi
  done
  print '找不到 Node.js，請先安裝 Node.js 再開啟作品。'
  read 'game_reply?按 Enter 關閉視窗。'
fi
