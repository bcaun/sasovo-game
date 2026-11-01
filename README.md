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
| `deploy/` | конфиг nginx и скрипт обновления на сервере |

## Изменить карту

```bash
python3 tools/check_map.py   # должно быть "problems 0" (Сасово — Глядково вплотную специально)
python3 tools/build.py
```

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
