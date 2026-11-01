#!/usr/bin/env bash
# Обновить игру на сервере до последней версии из GitHub.
# Запуск на сервере: bash /var/www/sasovo-game/deploy/update.sh
set -euo pipefail
cd /var/www/sasovo-game
git pull --ff-only
echo "Игра обновлена: $(git log -1 --format='%h %s')"
