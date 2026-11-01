# Дорога в Сасово

Браузерная железнодорожная стратегия по карте Московской, Рязанской и части Владимирской области.
Игроки собирают карты вагонов, строят перегоны и соединяют города из маршрутных билетов.
Три пути Москва → Сасово: основная магистраль, запасной путь и северный ход через Владимир.

Игра — один файл `public/index.html`, сервер и сборщики не нужны.
Сайт: https://sasovo.daagamma.com

## Структура

| Путь | Что это |
|---|---|
| `public/index.html` | готовая игра, её отдаёт nginx |
| `tools/template.html` | разметка, стили и логика игры |
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

## Обновление

```bash
bash /var/www/sasovo-game/deploy/update.sh
```
