"""Собирает колоду из 80 маршрутных билетов в tools/tickets.json.

Раскладка (ценность билета = длина кратчайшего пути в вагонах):
  6 дальних, от 20 вагонов — выдаются только при старте;
  74 обычных:
    17 коротких, 2–4 (ровно 2 билета по 2),
    40 средних, 5–11,
    17 длинных, 12–16 (ровно 3 билета по 16).

Запуск: node tools/export_graph.js && python3 tools/make_tickets.py && python3 tools/build.py
"""
import collections, heapq, itertools, json, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
g = json.load(open(os.path.join(HERE, "graph.json"), encoding="utf8"))
names = {c[0]: c[1] for c in g["cities"]}
exits = {c[0] for c in g["cities"] if c[2]}
adj = collections.defaultdict(dict)
for a, b, c in g["tracks"]:
    adj[a][b] = min(adj[a].get(b, 99), c)
    adj[b][a] = adj[a][b]

def dijkstra(s):
    d = {s: 0}; h = [(0, s)]
    while h:
        w, u = heapq.heappop(h)
        if w > d[u]: continue
        for v, c in adj[u].items():
            if w + c < d.get(v, 1e9):
                d[v] = w + c; heapq.heappush(h, (w + c, v))
    return d
D = {s: dijkstra(s) for s in names}

LONG = [("msk", "sas"), ("shah", "pnz"), ("dub", "div"), ("moz", "nn"), ("ser", "mur"), ("klin", "sar")]
for a, b in LONG:
    assert D[a][b] >= 20, f"дальний {names[a]} — {names[b]}: {D[a][b]} < 20"

# сколько обычных билетов каждой ценности
TARGET = {2: 2, 3: 7, 4: 8,
          5: 6, 6: 6, 7: 6, 8: 6, 9: 6, 10: 5, 11: 5,
          12: 4, 13: 4, 14: 3, 15: 3, 16: 3}
assert sum(TARGET.values()) == 74
assert sum(v for k, v in TARGET.items() if k <= 4) == 17
assert sum(v for k, v in TARGET.items() if 5 <= k <= 11) == 40
assert sum(v for k, v in TARGET.items() if k >= 12) == 17

rnd = random.Random(2026)
used = collections.Counter(x for p in LONG for x in p)
taken = {frozenset(p) for p in LONG}
MAX_PER_CITY, MAX_EXIT_TICKETS = 5, 9
exit_tickets = 0
regular = []
for value in sorted(TARGET, key=lambda v: sum(1 for a, b in itertools.combinations(names, 2) if D[a][b] == v)):
    for _ in range(TARGET[value]):
        cands = [(a, b) for a, b in itertools.combinations(sorted(names), 2)
                 if D[a][b] == value and frozenset((a, b)) not in taken
                 and not (a in exits and b in exits)
                 and used[a] < MAX_PER_CITY and used[b] < MAX_PER_CITY
                 and not ((a in exits or b in exits) and exit_tickets >= MAX_EXIT_TICKETS)]
        assert cands, f"не хватило пар на {value}"
        rnd.shuffle(cands)
        a, b = min(cands, key=lambda p: used[p[0]] + used[p[1]])
        if a in exits: a, b = b, a              # направление всегда второе
        regular.append({"a": a, "b": b, "pts": value})
        taken.add(frozenset((a, b))); used[a] += 1; used[b] += 1
        exit_tickets += (b in exits)

out = {"long": [{"a": a, "b": b, "pts": D[a][b]} for a, b in LONG],
       "regular": sorted(regular, key=lambda t: (t["pts"], names[t["a"]]))}
json.dump(out, open(os.path.join(HERE, "tickets.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
c = collections.Counter(t["pts"] for t in regular)
print("дальние:", [(names[t["a"]], names[t["b"]], t["pts"]) for t in out["long"]])
print("обычные:", len(regular), dict(sorted(c.items())))
print("чаще всего:", [(names[k], v) for k, v in used.most_common(5)], "реже всего:", [(names[k], v) for k, v in used.most_common()[-5:]])
