"""Собирает public/index.html из tools/template.html и tools/map_data.py.
Запуск: python3 tools/build.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ns = {}
exec(open(os.path.join(HERE, "map_data.py"), encoding="utf8").read(), ns)
# Домодедово — Бронницы: ЦКАД здесь совпадает с основной магистралью, отдельный путь не нужен
routes = [r for r in ns["ROUTES"] if not (r[0] == "bron" and r[1] == "dom")]
js = lambda v: json.dumps(v, ensure_ascii=False)
data = ("const CITY_DATA=[\n" + ",\n".join(" " + js(c) for c in ns["CITIES"]) + "\n];\n"
        "// ручные сдвиги (px), чтобы линии не пересекались и не задевали города\n"
        "const NUDGE=" + js(ns["NUDGE"]) + ";\n"
        "const ROUTE_DATA=[\n" + ",\n".join(" " + js(r) for r in routes) + "\n];\n"
        "const TICKET_DATA=" + json.dumps(json.load(open(os.path.join(HERE, "tickets.json"), encoding="utf8")), ensure_ascii=False) + ";")
tpl = open(os.path.join(HERE, "template.html"), encoding="utf8").read()
page = tpl.replace("/*@DATA@*/", data).replace(" 'tabindex=\"-1\" class-static'", " 'tabindex=\"-1\"'")
head, body = page.split("<header>", 1)
head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
out = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Дорога в Сасово — железнодорожная стратегия по карте Подмосковья и Рязанской области.">
<style>:root{{color-scheme:light}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{head.strip()}
</head>
<body>
<header>{body.rstrip()}
</body>
</html>
"""
os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
open(os.path.join(ROOT, "public", "index.html"), "w", encoding="utf8").write(out)
print("public/index.html собран")
