# Дорога в Сасово

Браузерная железнодорожная стратегия по карте Московской, Рязанской и части Владимирской области.
Игроки собирают карты вагонов, строят перегоны и соединяют города из маршрутных билетов.
Три пути Москва → Сасово: основная магистраль, запасной путь и северный ход через Владимир.

Режимы: с ботами, с друзьями за одним устройством и онлайн (каждый со своего устройства, нужен игровой сервер из `server/`).

Страница — один файл `public/index.html`. Онлайн-режим обслуживает `server/server.js` (Node.js 18+, без зависимостей).
Сайт: https://sasovo.daagamma.com

## Структура

| Путь | Что это |
|---|---|
| `public/index.html` | готовая игра, её отдаёт nginx |
| `server/server.js` | игровой сервер онлайн-режима: комнаты, ходы, боты |
| `server/core.js` | игровое ядро для сервера (собирается из `tools/core.js`) |
| `tools/core.js` | игровое ядро: карта, правила, боты, кто что видит |
| `tools/template.html` | разметка и стили страницы |
| `tools/client_game.js`, `tools/client_ui.js` | исходники клиентской части (уже вставлены в шаблон) |
| `tools/map_data.py` | города, перегоны, цвета, типы путей |
| `tools/build.py` | собирает `public/index.html` из шаблона и данных |
| `tools/check_map.py` | проверяет карту: пересечения линий, города вплотную |
| `tools/tickets.json` | колода из 80 маршрутов: 6 дальних и 74 обычных |
| `tools/make_tickets.py` | подбирает колоду маршрутов по заданной раскладке |
| `tools/export_graph.js` | выгружает перегоны с числом вагонов для подбора маршрутов |
| `deploy/` | конфиг nginx и скрипт обновления на сервере |

## Изменить карту

```bash
python3 tools/check_map.py   # должно быть "problems 0" (Сасово — Глядково вплотную специально)
python3 tools/build.py
```

Если поменялись перегоны, пересоберите колоду маршрутов:

```bash
python3 tools/build.py && node tools/export_graph.js && python3 tools/make_tickets.py && python3 tools/build.py
```

## Колода маршрутов

Очки билета равны длине кратчайшего пути в вагонах.

- 6 дальних, 20–22 вагона. Дают только при старте, отказ окончательный.
- 74 обычных: 17 коротких (2–4, из них 2 по 2), 40 средних (5–11), 17 длинных (12–16, из них 3 по 16).
- Старт: 1 дальний и 4 обычных, оставить минимум 2. Дальше в игре берут 3 обычных и оставляют минимум 1.

## Первая установка на сервер

```bash
git clone https://github.com/bcaun/sasovo-game.git /var/www/sasovo-game
cp /var/www/sasovo-game/deploy/sasovo.nginx.conf /etc/nginx/sites-available/sasovo.conf
ln -sf /etc/nginx/sites-available/sasovo.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d sasovo.daagamma.com --redirect
```

## Онлайн-режим (один раз)

```bash
bash /var/www/sasovo-game/deploy/install-online.sh
```

Скрипт ставит Node.js (если его нет), запускает службу `sasovo-server` и добавляет в nginx проброс `/api/` на `127.0.0.1:8787`.
Комнаты сохраняются в `/var/lib/sasovo-server/rooms.json`, поэтому перезапуск сервера партии не обрывает.

Проверка и журнал:

```bash
systemctl status sasovo-server
journalctl -u sasovo-server -n 50
```

Локальный запуск для разработки:

```bash
cd server && STATIC_DIR=../public node server.js   # http://127.0.0.1:8787
```

## Обновление

```bash
bash /var/www/sasovo-game/deploy/update.sh
```
