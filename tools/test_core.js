// Проверка игровой логики: сотни партий ботов и «хаотичных» игроков с проверкой инвариантов после каждого шага.
// Запуск: python3 tools/build.py && node tools/test_core.js [число партий]
"use strict";
const C = require("../server/core.js");
const N = Number(process.argv[2]) || 300;
let failures = 0;
const fail = (msg, ctx) => { failures++; if (failures <= 25) console.log("  ✗", msg, ctx ? JSON.stringify(ctx).slice(0, 300) : ""); };
const check = (cond, msg, ctx) => { if (!cond) fail(msg, ctx); };

// ---------- статические проверки данных ----------
console.log("Данные карты и колоды");
const TOTAL_CARDS = 8 * 12 + 14;
check(C.tracks.every(t => t.cars >= 1 && t.cars <= 6), "длина перегона вне 1–6");
check(C.tracks.filter(t => t.tunnel).length > 0, "нет ни одной пробки");
check(C.LONG_TICKETS.length === 6, "дальних маршрутов не 6", C.LONG_TICKETS.length);
check(C.REGULAR_TICKETS.length === 74, "обычных маршрутов не 74", C.REGULAR_TICKETS.length);
check(C.LONG_TICKETS.every(t => t.pts >= 20 && t.pts <= 22), "дальний маршрут вне 20–22");
const dist = {}; C.REGULAR_TICKETS.forEach(t => dist[t.pts] = (dist[t.pts] || 0) + 1);
const sum = f => Object.entries(dist).filter(([k]) => f(+k)).reduce((a, [, v]) => a + v, 0);
check(sum(v => v >= 2 && v <= 4) === 17 && sum(v => v >= 5 && v <= 11) === 40 && sum(v => v >= 12 && v <= 16) === 17, "раскладка 17/40/17 нарушена", dist);
check(dist[2] === 2 && dist[16] === 3, "должно быть 2 билета по 2 и 3 по 16", dist);
[...C.LONG_TICKETS, ...C.REGULAR_TICKETS].forEach(t => {
  const p = C.shortest(t.a, t.b);
  check(p && p.cars === t.pts, `очки билета ≠ кратчайшему пути: ${C.tName(t)}`, { pts: t.pts, path: p && p.cars });
});
const keys = new Set([...C.LONG_TICKETS, ...C.REGULAR_TICKETS].map(t => [t.a, t.b].sort().join("|")));
check(keys.size === 80, "в колоде есть повторяющиеся маршруты", keys.size);
console.log(`  перегонов ${C.tracks.length}, пробок ${C.tracks.filter(t => t.tunnel).length}, маршрутов ${keys.size}`);

// ---------- инварианты состояния ----------
function invariants(G, where) {
  const ctx = { where, turn: G.turn, phase: G.phase };
  const hands = G.players.reduce((a, p) => a + Object.values(p.hand).reduce((x, y) => x + y, 0), 0);
  check(G.deck.length + G.discard.length + G.market.length + hands === TOTAL_CARDS, "карты вагонов не сходятся", { ...ctx, deck: G.deck.length, discard: G.discard.length, market: G.market.length, hands });
  G.players.forEach((p, i) => Object.entries(p.hand).forEach(([k, v]) => check(v >= 0, "отрицательное число карт", { ...ctx, i, k, v })));
  check(G.market.length <= 5, "на рынке больше 5 карт", ctx);
  const pend = Object.values(G.pending).reduce((a, x) => a + x.offer.length, 0);
  const held = G.players.reduce((a, p) => a + p.tickets.length, 0);
  check(G.shortDeck.length + G.longDeck.length + G.longOut.length + held + pend === 80, "маршруты не сходятся", { ...ctx, held, pend });
  const ids = [...G.shortDeck, ...G.longDeck, ...G.longOut, ...G.players.flatMap(p => p.tickets), ...Object.values(G.pending).flatMap(x => x.offer)].map(t => t.a + "|" + t.b);
  check(new Set(ids).size === ids.length, "один маршрут лежит в двух местах", ctx);
  check(G.longDeck.length + G.longOut.length + G.players.reduce((a, p) => a + p.tickets.filter(t => t.long).length, 0) + Object.values(G.pending).reduce((a, x) => a + x.offer.filter(t => t.long).length, 0) === 6, "дальние маршруты потерялись", ctx);
  G.players.forEach((p, i) => {
    const own = C.tracks.filter(t => G.owner[t.id] === i);
    check(p.cars + own.reduce((a, t) => a + t.cars, 0) === C.CARS_PER_PLAYER, "вагоны игрока не сходятся", { ...ctx, i, cars: p.cars });
    check(p.cars >= 0, "вагонов меньше нуля", { ...ctx, i });
    check(p.score === own.reduce((a, t) => a + C.trackPoints(t), 0), "очки за перегоны не сходятся", { ...ctx, i, score: p.score });
  });
  Object.values(C.groups).forEach(g => {
    const owners = g.map(t => G.owner[t.id]).filter(x => x !== undefined);
    check(new Set(owners).size === owners.length, "один игрок занял оба пути перегона", { ...ctx, key: g[0].key });
    if (G.players.length <= 3) check(owners.length <= 1, "при 2–3 игроках заняты оба пути двойного перегона", { ...ctx, key: g[0].key });
  });
  if (G.tunnel) check(G.tunnel.pi === G.turn && C.tracks[G.tunnel.track].tunnel && G.tunnel.extra > 0, "странное состояние пробки", ctx);
  // видимость: чужие руки и маршруты не видны
  G.players.forEach((_, me) => {
    const V = C.view(G, me);
    V.players.forEach((q, i) => {
      if (i !== me) { check(q.hand === null, "виден чужой рука", { ...ctx, me, i }); if (!G.over) check(q.tickets === null, "видны чужие маршруты", { ...ctx, me, i }); }
    });
  });
}

// ---------- игроки ----------
const pick = a => a[Math.floor(Math.random() * a.length)];
function randomHuman(G, pi) {
  // хаотичный игрок: любые действия, в том числе запрещённые
  const p = G.players[pi];
  if (G.pending[pi]) {
    const n = G.pending[pi].offer.length, idx = [...Array(n).keys()].filter(() => Math.random() < .6);
    return { type: "keep", idx: Math.random() < .1 ? [] : idx };
  }
  if (G.tunnel && G.tunnel.pi === pi) return { type: "tunnel", pay: Math.random() < .6 };
  const r = Math.random();
  if (r < .35) return { type: "market", i: Math.floor(Math.random() * 6) };
  if (r < .6) return { type: "deck" };
  if (r < .9) { const t = pick(C.tracks); return { type: "claim", track: t.id, opt: Math.floor(Math.random() * 3) }; }
  if (r < .97) return { type: "tickets" };
  return pick([{ type: "tunnel", pay: true }, { type: "bogus" }, { type: "claim", track: 9999 }]);
}

function playGame(nPlayers, mode) {
  const cfg = [...Array(nPlayers)].map((_, i) => ({ name: "И" + i, bot: mode === "bots" || (mode === "mixed" && i > 0) }));
  const { G } = C.createGame(cfg);
  invariants(G, "start");
  const stats = { steps: 0, tunnels: 0, tunnelFails: 0, extra: 0, rejected: 0 };
  for (let step = 0; step < 20000 && !G.over; step++) {
    stats.steps++;
    let ev;
    if (G.phase === "setup") {
      const pi = Number(Object.keys(G.pending)[0]);
      const r = C.act(G, pi, randomHuman(G, pi)); if (!r.ok) stats.rejected++; ev = r.events;
    } else if (G.players[G.turn].bot) {
      ev = C.botStep(G);
    } else {
      // иногда ход пытается сделать не тот игрок
      const pi = Math.random() < .05 ? (G.turn + 1) % nPlayers : G.turn;
      const r = C.act(G, pi, randomHuman(G, pi)); if (!r.ok) stats.rejected++; ev = r.events;
    }
    (ev || []).forEach(e => {
      if (e.type === "tunnel") { stats.tunnels++; stats.extra += e.extra; }
      if (e.type === "tunnelFail") stats.tunnelFails++;
    });
    invariants(G, mode + "#" + step);
  }
  check(G.over, `партия не закончилась за 20000 шагов (${mode}, ${nPlayers})`);
  if (G.over) {
    const R = G.results;
    check(R && R.length === nPlayers, "нет итогов");
    R.forEach(r => {
      const p = G.players[r.pi];
      check(r.total === r.route + r.tp - r.tm + r.bCk + r.bBm + r.bLt, "итог не равен сумме слагаемых", r);
      p.tickets.forEach(t => {
        const adj = {}; C.tracks.forEach(x => { if (G.owner[x.id] === r.pi) { (adj[x.a] = adj[x.a] || []).push(x.b); (adj[x.b] = adj[x.b] || []).push(x.a); } });
        const seen = new Set([t.a]), st = [t.a]; while (st.length) { const u = st.pop(); for (const v of adj[u] || []) if (!seen.has(v)) { seen.add(v); st.push(v); } }
        check(!!t.done === seen.has(t.b), "отметка «выполнен» не совпадает со связностью", { t: C.tName(t) });
      });
    });
    check(R[0].total >= R[R.length - 1].total, "итоги не отсортированы");
    const ended = G.players.some(p => p.cars <= 2);
    stats.endedByCars = ended;
  }
  stats.over = G.over; stats.results = G.results;
  return stats;
}

// ---------- прогон ----------
function run(mode, games) {
  const agg = { games: 0, over: 0, steps: 0, tunnels: 0, tunnelFails: 0, extra: 0, rejected: 0, byCars: 0, done: 0, held: 0, scores: [] };
  for (let g = 0; g < games; g++) {
    const n = 2 + (g % 3);
    const s = playGame(n, mode);
    agg.games++; agg.over += s.over ? 1 : 0; agg.steps += s.steps; agg.tunnels += s.tunnels; agg.tunnelFails += s.tunnelFails; agg.extra += s.extra; agg.rejected += s.rejected; agg.byCars += s.endedByCars ? 1 : 0;
    if (s.results) s.results.forEach(r => agg.scores.push(r.total));
  }
  const avg = x => (x / agg.games).toFixed(1);
  const sc = agg.scores.sort((a, b) => a - b), q = f => sc[Math.floor(f * (sc.length - 1))];
  console.log(`  ${mode}: партий ${agg.games}, доиграно ${agg.over}, закончились по вагонам ${agg.byCars}; шагов в среднем ${avg(agg.steps)}; пробок за партию ${avg(agg.tunnels)} (доплата в среднем ${(agg.extra / Math.max(1, agg.tunnels)).toFixed(2)}, сорвалось ${agg.tunnelFails}); отклонено ходов ${agg.rejected}; итоговые очки: медиана ${q(.5)}, от ${q(0)} до ${q(1)}`);
}
console.log(`Партии (${N} каждого вида, по 2/3/4 игрока)`);
run("bots", N);
run("mixed", N);
run("chaos", Math.ceil(N / 3));
console.log(failures ? `\nОШИБОК: ${failures}` : "\nВсё в порядке: нарушений не найдено.");
process.exit(failures ? 1 : 0);
