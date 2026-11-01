#!/usr/bin/env bash
# Подключить Telegram-бота к игровому серверу (один раз, после @BotFather).
# Запуск на сервере: bash /var/www/sasovo-game/deploy/setup-telegram.sh
set -euo pipefail
cd /var/www/sasovo-game
git pull --ff-only

echo "Данные бота из @BotFather. Токен не показывается на экране при вводе."
read -r -s -p "Токен бота (вида 123456:ABC...): " BOT_TOKEN; echo
read -r -p "Имя бота без @ (например, sasovo_game_bot): " BOT_USERNAME
read -r -p "Короткое имя мини-приложения из /newapp (например, play): " APP_NAME
PUBLIC_URL="https://sasovo.daagamma.com"

if ! curl -fsS "https://api.telegram.org/bot${BOT_TOKEN}/getMe" >/dev/null; then
  echo "Telegram не принял токен. Проверьте его в @BotFather (/mybots → API Token)."; exit 1
fi

umask 077
cat > /etc/sasovo-server.env <<ENV
BOT_TOKEN=${BOT_TOKEN}
BOT_USERNAME=${BOT_USERNAME#@}
APP_NAME=${APP_NAME}
PUBLIC_URL=${PUBLIC_URL}
ENV
chmod 600 /etc/sasovo-server.env

cp deploy/sasovo-server.service /etc/systemd/system/sasovo-server.service
systemctl daemon-reload
systemctl restart sasovo-server
sleep 2
journalctl -u sasovo-server -n 5 --no-pager | grep -i telegram || true
echo
echo "Готово. Откройте https://t.me/${BOT_USERNAME#@} и нажмите «Старт»."
echo "Ссылка на игру: https://t.me/${BOT_USERNAME#@}/${APP_NAME}"
