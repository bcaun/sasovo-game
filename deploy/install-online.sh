#!/usr/bin/env bash
# Включить онлайн-режим на сервере (один раз).
# Запуск на сервере: bash /var/www/sasovo-game/deploy/install-online.sh
set -euo pipefail
cd /var/www/sasovo-game
git pull --ff-only

# 1. Node.js 18+
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "Ставлю Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

# 2. Служба игрового сервера
cp deploy/sasovo-server.service /etc/systemd/system/sasovo-server.service
systemctl daemon-reload
systemctl enable --now sasovo-server
sleep 1
curl -fsS http://127.0.0.1:8787/api/health && echo "  ← игровой сервер отвечает"

# 3. nginx: проброс /api/ на игровой сервер
CONF=/etc/nginx/sites-available/sasovo.conf
if grep -q "location /api/" "$CONF"; then
  echo "В nginx /api/ уже настроен."
else
  cp "$CONF" "$CONF.bak.$(date +%s)"
  python3 - "$CONF" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
snippet = open("/var/www/sasovo-game/deploy/api.nginx.snippet").read()
# вставляем в блок server, где есть listen 443 (его добавил certbot); иначе — в первый server
blocks = [m.start() for m in re.finditer(r"server\s*\{", s)]
target = None
for i, start in enumerate(blocks):
    end = blocks[i + 1] if i + 1 < len(blocks) else len(s)
    if "listen 443" in s[start:end] or "listen [::]:443" in s[start:end]:
        target = start; break
if target is None: target = blocks[0]
brace = s.index("{", target) + 1
s = s[:brace] + "\n" + snippet + s[brace:]
open(p, "w").write(s)
PY
  echo "Добавил /api/ в $CONF (копия старого файла рядом)."
fi
nginx -t && systemctl reload nginx
echo "Готово. Откройте https://sasovo.daagamma.com → Новая игра → Онлайн с друзьями."
