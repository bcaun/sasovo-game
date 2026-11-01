#!/usr/bin/env bash
# Обновить игру на сервере до последней версии из GitHub.
# Запуск на сервере: bash /var/www/sasovo-game/deploy/update.sh
set -euo pipefail
cd /var/www/sasovo-game
git pull --ff-only
if systemctl list-unit-files sasovo-server.service >/dev/null 2>&1 && systemctl is-enabled --quiet sasovo-server; then
  systemctl restart sasovo-server
  echo "Игровой сервер перезапущен."
fi
echo "Игра обновлена: $(git log -1 --format='%h %s')"
