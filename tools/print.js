// Печатные материалы «Дорога в Сасово» → print/*.pdf
//   sasovo-map-A4-3x2.pdf   карта-постер на 6 листах A4 (3 по ширине × 2 по высоте) с памяткой и треком очков
//   sasovo-cards.pdf        80 маршрутов + 110 карт вагонов + 2 памятки, карточки 44×68 мм, 16 на лист
//   sasovo-card-backs.pdf   рубашки: лист маршрутов и лист вагонов (печатать на обороте)
// Запуск: python3 tools/build.py && node tools/print.js
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "print");

// ---------- геометрия листа ----------
const A4 = { w: 210, h: 297 };
const TILE = { w: 200, h: 287 };              // печатная область листа карты (поля 5 мм)
const POSTER = { w: TILE.w * 3, h: TILE.h * 2 }; // 600 × 574 мм
const CARD = { w: 44, h: 68, cols: 4, rows: 4 };  // 176 × 272 мм на листе

// всё, что рисуется, собирается внутри страницы игры: там есть ядро, готовая SVG-карта и картинки карт
function buildInPage({ A4, TILE, POSTER, CARD }) {
  const C = window.__oka.Core;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const styles = [...document.querySelectorAll("style")].map(s => s.textContent).join("\n");
  const fontsHref = document.querySelector('link[rel="stylesheet"]').href;

  // ----- карта -----
  const live = document.getElementById("map");
  const vb = live.getAttribute("viewBox").split(" ").map(Number);
  const clone = live.cloneNode(true);
  clone.querySelectorAll(".grain").forEach(n => n.remove());
  clone.querySelectorAll(".trk").forEach(n => n.classList.remove("can", "on"));
  const mapInner = clone.innerHTML;
  const mapH = +(POSTER.w * vb[3] / vb[2]).toFixed(1);

  const INK = "#3b2f1e", MUTED = "#7d6a48", PAPER = "#f2e6c4", RUST = "#c4784a";
  const T = (x, y, s, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${s}" fill="${o.fill || INK}" font-family="${o.f || "'PT Serif',Georgia,serif"}" font-weight="${o.w || 400}" ${o.it ? 'font-style="italic"' : ""} ${o.a ? `text-anchor="${o.a}"` : ""}>${esc(txt)}</text>`;
  const carsRow = (x, y, color, n = 2) => [...Array(n)].map((_, i) => `<rect x="${x + i * 8}" y="${y}" width="7" height="2.6" rx=".4" fill="${color}" stroke="rgba(40,28,12,.6)" stroke-width=".25"/>`).join("");
  let py = mapH + 6;
  const panel = [];
  panel.push(`<rect x="0" y="${mapH}" width="${POSTER.w}" height="${POSTER.h - mapH}" fill="${PAPER}"/>`);
  panel.push(`<line x1="8" y1="${mapH + 1.5}" x2="${POSTER.w - 8}" y2="${mapH + 1.5}" stroke="${INK}" stroke-width=".5"/>`);
  // колонка 1: ход
  let x0 = 10, y = py + 6;
  panel.push(T(x0, y, 5.2, "Ход — одно из трёх", { f: "'Old Standard TT',Georgia,serif", w: 700 }));
  [["1. Взять 2 карты вагонов", "с рынка (5 открытых) или из колоды. Тепловоз с рынка —"], ["", "только первой картой и вместо обеих."],
   ["2. Построить перегон:", "сбросить столько карт его цвета, сколько вагонов."], ["", "Тепловоз — любой цвет. Серый перегон — любой один цвет."],
   ["3. Взять 3 маршрута", "и оставить минимум один."]].forEach(([b, t], i) => {
    y += 6.2; panel.push(`<text x="${x0}" y="${y}" font-size="3.6" fill="${INK}" font-family="'PT Serif',Georgia,serif"><tspan font-weight="700">${esc(b)}</tspan> ${esc(t)}</text>`);
  });
  y += 9; panel.push(T(x0, y, 5.2, "Пробка", { f: "'Old Standard TT',Georgia,serif", w: 700 }));
  ["Заплатите за перегон, откройте 3 карты из колоды.", "За каждую карту вашего цвета и каждый тепловоз —", "доплата одной картой. Не можете — перегон не строится,", "карты возвращаются в руку, ход потерян."].forEach(t => { y += 5.6; panel.push(T(x0, y, 3.6, t)); });
  // колонка 2: обозначения
  x0 = 205; y = py + 6;
  panel.push(T(x0, y, 5.2, "Обозначения", { f: "'Old Standard TT',Georgia,serif", w: 700 }));
  const leg = [
    [`<rect x="0" y="-3" width="18" height="5.6" fill="#e8b020" opacity=".35"/>${carsRow(1.5, -2.3, "#d1453b")}`, "основная магистраль, два пути"],
    [`<rect x="0" y="-3" width="18" height="5.6" fill="#3aa0d8" opacity=".4"/>${carsRow(1.5, -1.3, "#3a74c4")}`, "скоростная: +1 карта к оплате, +2 очка"],
    [carsRow(1.5, -1.3, "#a3a9b0"), "серый путь: любой один цвет"],
    [`<rect x="0" y="-3" width="18" height="5.6" fill="url(#jamHatch)" opacity=".7"/>${carsRow(1.5, -1.3, "#3a74c4")}`, "пробка: возможна доплата"],
    [`<rect x="0" y="-3" width="18" height="5.6" fill="#e39a2d" opacity=".25"/><line x1="0" y1="-.2" x2="18" y2="-.2" stroke="#e39a2d" stroke-width=".5" stroke-dasharray="2 1.6"/>`, "ЦКАД, станции с оранжевым ободком"],
    [`<line x1="0" y1="-.2" x2="18" y2="-.2" stroke="#7a5a3c" stroke-width="5" stroke-dasharray=".7 1.4" opacity=".5"/>`, "Большое бетонное кольцо (БМО)"],
    [`<circle cx="9" cy="-.2" r="2" fill="${PAPER}" stroke="${INK}" stroke-width=".45" stroke-dasharray="1 .7"/>`, "направление за край карты"],
  ];
  leg.forEach(([g, t]) => { y += 7.4; panel.push(`<g transform="translate(${x0} ${y - 1.2})">${g}</g>` + T(x0 + 22, y, 3.6, t)); });
  // колонка 3: очки
  x0 = 410; y = py + 6;
  panel.push(T(x0, y, 5.2, "Очки за перегон", { f: "'Old Standard TT',Georgia,serif", w: 700 }));
  y += 4;
  [1, 2, 3, 4, 5, 6].forEach((n, i) => {
    const cx = x0 + i * 30;
    panel.push(`<rect x="${cx}" y="${y}" width="27" height="13" rx="1.5" fill="none" stroke="${INK}" stroke-width=".35"/>` +
      T(cx + 13.5, y + 5.4, 3.4, `${n} ваг.`, { a: "middle", fill: MUTED }) + T(cx + 13.5, y + 11.2, 5.4, String(C.ROUTE_POINTS[n]), { a: "middle", w: 700, f: "'Old Standard TT',Georgia,serif" }));
  });
  y += 21; panel.push(T(x0, y, 5.2, "Конец игры и бонусы", { f: "'Old Standard TT',Georgia,serif", w: 700 }));
  [`У кого-то ≤ 2 вагонов — каждый делает ещё один ход.`, `Маршруты: выполненный +очки, невыполненный −очки.`,
   `Больше всех перегонов ЦКАД: +${C.RING_BONUS}. Больше всех БМО: +${C.RING_BONUS}.`, `Самая длинная непрерывная дорога: +${C.LONGEST_BONUS}.`,
   `У каждого ${C.CARS_PER_PLAYER} вагонов, 4 карты и 5 маршрутов на старте (≥2).`].forEach(t => { y += 5.6; panel.push(T(x0, y, 3.6, t)); });
  // трек очков 0…149
  const cellW = (POSTER.w - 20) / 50, cellH = 8.6, ty = POSTER.h - 3 * cellH - 5;
  panel.push(T(10, ty - 2.5, 3.6, "Трек очков: за 150 — начните второй круг и запомните это.", { it: true, fill: MUTED }));
  for (let i = 0; i < 150; i++) {
    const r = Math.floor(i / 50), c = i % 50, x = 10 + c * cellW, yy = ty + r * cellH, hi = i % 10 === 0;
    panel.push(`<rect x="${x}" y="${yy}" width="${cellW}" height="${cellH}" fill="${hi ? "#ead9a8" : "none"}" stroke="${INK}" stroke-width=".3"/>` +
      T(x + cellW / 2, yy + cellH / 2 + 1.4, hi ? 3.8 : 3.2, String(i), { a: "middle", w: hi ? 700 : 400, fill: hi ? INK : MUTED }));
  }
  const posterInner = `<rect x="0" y="0" width="${POSTER.w}" height="${mapH}" fill="#ddcfa6"/>
    <svg x="0" y="0" width="${POSTER.w}" height="${mapH}" viewBox="${vb.join(" ")}" preserveAspectRatio="xMidYMid meet">${mapInner}</svg>${panel.join("")}`;

  const marks = (w, h) => { // метки обрезки в углах печатной области
    const L = 4, o = 0.5, s = 'stroke="#555" stroke-width=".2"';
    return `<svg class="marks" width="${A4.w}mm" height="${A4.h}mm" viewBox="0 0 ${A4.w} ${A4.h}">${[[5, 5], [5 + w, 5], [5, 5 + h], [5 + w, 5 + h]].map(([x, y]) =>
      `<line x1="${x - L - o}" y1="${y}" x2="${x - o}" y2="${y}" ${s}/><line x1="${x + o}" y1="${y}" x2="${x + L + o}" y2="${y}" ${s}/>` +
      `<line x1="${x}" y1="${y - L - o}" x2="${x}" y2="${y - o}" ${s}/><line x1="${x}" y1="${y + o}" x2="${x}" y2="${y + L + o}" ${s}/>`).join("")}</svg>`;
  };
  const mapPages = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const n = r * 3 + c + 1;
    mapPages.push(`<section class="page"><svg class="tile" width="${TILE.w}mm" height="${TILE.h}mm" viewBox="${c * TILE.w} ${r * TILE.h} ${TILE.w} ${TILE.h}" xmlns="http://www.w3.org/2000/svg">${posterInner}</svg>${marks(TILE.w, TILE.h)}
      <div class="label">Дорога в Сасово · карта · лист ${n} из 6 (ряд ${r + 1}, колонка ${c + 1}) · обрежьте поля по меткам и склейте встык</div></section>`);
  }

  // ----- карточки -----
  const pts = [...live.querySelectorAll("#borders polygon.region-fill")].map(p => p.getAttribute("points"));
  const xs = Object.values(C.cities).map(c => c.x), ys = Object.values(C.cities).map(c => c.y);
  const mb = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + 60, h: Math.max(...ys) - Math.min(...ys) + 60 };
  const lines = Object.values(C.groups).map(g => { const a = C.cities[g[0].a], b = C.cities[g[0].b]; return `M${a.x} ${a.y}L${b.x} ${b.y}`; }).join("");
  const dots = Object.values(C.cities).map(c => `<circle cx="${c.x}" cy="${c.y}" r="${c.big ? 13 : 9}" fill="${c.exit ? "#efe2bf" : "#6b5a3e"}" ${c.exit ? 'stroke="#6b5a3e" stroke-width="4"' : ""}/>`).join("");
  const miniBase = `<g>${pts.map((p, i) => `<polygon points="${p}" fill="${["#e9dcf0", "#f3e2c8", "#e2ecd6"][i] || "#eee"}" stroke="#b9a98a" stroke-width="5"/>`).join("")}
    <path d="${lines}" stroke="#a8977a" stroke-width="7" fill="none"/>${dots}</g>`;
  const mini = (a, b) => { const A = C.cities[a], B = C.cities[b];
    return `<svg x="3" y="11" width="38" height="29" viewBox="${mb.x} ${mb.y} ${mb.w} ${mb.h}" preserveAspectRatio="xMidYMid meet">${miniBase}
      <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#c0392b" stroke-width="10" stroke-dasharray="26 18" opacity=".8"/>
      ${[A, B].map(c => `<circle cx="${c.x}" cy="${c.y}" r="30" fill="#c0392b" stroke="#fff" stroke-width="9"/>`).join("")}</svg>`; };
  const frame = (bg, line, inner) => `<svg width="${CARD.w}mm" height="${CARD.h}mm" viewBox="0 0 ${CARD.w} ${CARD.h}">
    <rect x="0" y="0" width="${CARD.w}" height="${CARD.h}" fill="#fffaf0"/>
    <rect x="1.6" y="1.6" width="${CARD.w - 3.2}" height="${CARD.h - 3.2}" rx="2.2" fill="${bg}" stroke="${INK}" stroke-width=".45"/>
    <rect x="2.9" y="2.9" width="${CARD.w - 5.8}" height="${CARD.h - 5.8}" rx="1.5" fill="none" stroke="${line}" stroke-width=".3"/>${inner}</svg>`;
  const cityLines = t => [C.cities[t.a].n, (C.cities[t.b].exit ? "→ " : "") + C.cities[t.b].n];
  // жирный шрифт с засечками: ширина буквы ≈ 0,58 кегля; подбираем кегль под ширину строки
  const fitSize = (s, room = 35) => Math.min(4.2, +(room / (s.length * 0.58)).toFixed(2));
  const ticketCard = t => {
    const long = !!t.long, [n1, n2] = cityLines(t);
    return frame("#fbf3dc", long ? "#b8892c" : RUST, `
      <rect x="2.9" y="2.9" width="${CARD.w - 5.8}" height="6.6" fill="${long ? "#5e1b20" : INK}"/>
      ${T(CARD.w / 2, 7.4, 3, long ? "ДАЛЬНИЙ МАРШРУТ" : "МАРШРУТ", { a: "middle", fill: long ? "#d4b064" : "#f6ecd2", w: 700 })}
      <rect x="3" y="11" width="38" height="29" fill="#f6ecd2" stroke="#b9a98a" stroke-width=".2"/>${mini(t.a, t.b)}
      <circle cx="${CARD.w - 8.4}" cy="38.6" r="5.4" fill="${long ? "#5e1b20" : INK}" stroke="#fbf3dc" stroke-width=".8"/>
      ${T(CARD.w - 8.4, 40.5, t.pts > 9 ? 4.9 : 5.5, String(t.pts), { a: "middle", fill: "#f6ecd2", w: 700, f: "'Old Standard TT',Georgia,serif" })}
      ${T(4.4, 49.4, fitSize(n1), n1, { w: 700 })}${T(4.4, 53.6, 3, "—", { fill: MUTED })}${T(4.4, 58.4, fitSize(n2), n2, { w: 700 })}
      ${T(4.4, CARD.h - 4.8, 2.4, C.cities[t.b].exit ? "направление за край карты" : "Дорога в Сасово", { it: true, fill: MUTED })}`);
  };
  const face = (html, color) => { // картинка карты из игры (66×46), вписанная в портретную карточку
    const inner = html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    return `<svg x="3.6" y="15" width="36.8" height="25.6" viewBox="0 0 66 46">${inner}</svg>`;
  };
  const wagonCard = c => {
    const loco = c === "loco", name = loco ? "тепловоз" : C.COLORS[c][1], fill = loco ? "#1f2a24" : C.COLORS[c][0];
    const light = c === "white" || c === "yellow", txt = loco ? "#d4b064" : light ? INK : "#f6ecd2";
    const art = loco ? window.__printFaces.loco : window.__printFaces.wagon(c);
    return frame(fill, txt, `${T(CARD.w / 2, 10.4, 3.6, name.toUpperCase(), { a: "middle", fill: txt, w: 700 })}${face(art, c)}
      ${T(CARD.w / 2, 49.5, 2.9, loco ? "заменяет любой цвет" : "вагон", { a: "middle", fill: txt, it: true })}
      ${T(5, CARD.h - 5.2, 2.6, name, { fill: txt })}${T(CARD.w - 5, CARD.h - 5.2, 2.6, name, { a: "end", fill: txt })}`);
  };
  const aidCard = k => frame("#fbf3dc", RUST, k === 0 ? `
      ${T(CARD.w / 2, 8.6, 3.6, "ПАМЯТКА · ХОД", { a: "middle", w: 700 })}
      ${["Одно действие за ход:", "• 2 карты с рынка/колоды", "  (тепловоз с рынка = обе)", "• построить перегон", "• взять 3 маршрута, ≥1", "", "Пробка: открыть 3 карты,", "за свой цвет и тепловоз", "+1 карта. Нет карт —", "перегон не построен."].map((t, i) => T(4.4, 15 + i * 4.6, 2.85, t)).join("")}` : `
      ${T(CARD.w / 2, 8.6, 3.6, "ПАМЯТКА · ОЧКИ", { a: "middle", w: 700 })}
      ${[1, 2, 3, 4, 5, 6].map((n, i) => T(8, 15.5 + i * 4.6, 3.1, `${n} ваг. — ${C.ROUTE_POINTS[n]} очк.`)).join("")}
      ${["Скоростная: +2", `ЦКАД больше всех: +${C.RING_BONUS}`, `БМО больше всех: +${C.RING_BONUS}`, `Длинная дорога: +${C.LONGEST_BONUS}`].map((t, i) => T(8, 46 + i * 4.4, 2.9, t)).join("")}`);
  const ticketBack = () => frame("#5e1b20", "#d4b064", `
      ${window.__printFaces.backWheel}
      ${T(CARD.w / 2, 46, 4.4, "Дорога", { a: "middle", fill: "#f6ecd2", w: 700, f: "'Old Standard TT',Georgia,serif" })}
      ${T(CARD.w / 2, 51.5, 4.4, "в Сасово", { a: "middle", fill: "#f6ecd2", w: 700, f: "'Old Standard TT',Georgia,serif" })}
      ${T(CARD.w / 2, 59, 2.6, "маршрутный билет", { a: "middle", fill: "#d4b064", it: true })}`);
  const wagonBack = () => frame("#1f2a24", "#d4b064", `${window.__printFaces.backWheel}
      ${T(CARD.w / 2, 49, 3.2, "КАРТА ВАГОНОВ", { a: "middle", fill: "#d4b064", w: 700 })}`);

  const cardSheet = (cards, title) => {
    const gw = CARD.w * CARD.cols, gh = CARD.h * CARD.rows, ox = (A4.w - gw) / 2, oy = (A4.h - gh) / 2;
    const cells = cards.map((html, i) => `<div class="card" style="left:${ox + (i % CARD.cols) * CARD.w}mm;top:${oy + Math.floor(i / CARD.cols) * CARD.h}mm">${html}</div>`).join("");
    // линии реза: по всей сетке и метки на полях
    let cut = "";
    for (let c = 0; c <= CARD.cols; c++) { const x = ox + c * CARD.w; cut += `<line x1="${x}" y1="${oy - 6}" x2="${x}" y2="${oy + gh + 6}"/>`; }
    for (let r = 0; r <= CARD.rows; r++) { const y = oy + r * CARD.h; cut += `<line x1="${ox - 6}" y1="${y}" x2="${ox + gw + 6}" y2="${y}"/>`; }
    return `<section class="page">${cells}<svg class="marks" width="${A4.w}mm" height="${A4.h}mm" viewBox="0 0 ${A4.w} ${A4.h}"><g stroke="#9a8f80" stroke-width=".15" stroke-dasharray="1.2 1.2">${cut}</g></svg>
      <div class="label" style="bottom:${(A4.h - gh) / 2 - 7}mm">${esc(title)}</div></section>`;
  };
  const tickets = [...C.LONG_TICKETS, ...[...C.REGULAR_TICKETS].sort((a, b) => a.pts - b.pts)].map(ticketCard);
  const wagons = [];
  C.CARD_COLORS.forEach(c => { for (let i = 0; i < 12; i++) wagons.push(wagonCard(c)); });
  for (let i = 0; i < 14; i++) wagons.push(wagonCard("loco"));
  wagons.push(aidCard(0), aidCard(1));
  const per = CARD.cols * CARD.rows, cardPages = [];
  for (let i = 0; i < tickets.length; i += per) cardPages.push(cardSheet(tickets.slice(i, i + per), `Маршруты · лист ${i / per + 1} из ${Math.ceil(tickets.length / per)} · 44×68 мм, режьте по пунктиру`));
  for (let i = 0; i < wagons.length; i += per) cardPages.push(cardSheet(wagons.slice(i, i + per), `Карты вагонов · лист ${i / per + 1} из ${Math.ceil(wagons.length / per)} · 44×68 мм, режьте по пунктиру`));
  const backPages = [cardSheet(Array(per).fill(ticketBack()), "Рубашка маршрутов · печатать на обороте 5 листов маршрутов"),
                     cardSheet(Array(per).fill(wagonBack()), "Рубашка вагонов · печатать на обороте 7 листов вагонов")];

  const doc = body => `<!doctype html><html lang="ru" data-theme="light"><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsHref}">
    <style>${styles}</style><style>@page{size:A4;margin:0}html,body{margin:0!important;padding:0!important;background:#fff!important;height:auto!important;overflow:visible!important}
    .page{position:relative;width:${A4.w}mm;height:${A4.h}mm;overflow:hidden;page-break-after:always;break-after:page}
    .tile{position:absolute;left:5mm;top:5mm;overflow:hidden}.marks{position:absolute;left:0;top:0;pointer-events:none}
    .card{position:absolute;width:${CARD.w}mm;height:${CARD.h}mm}.card svg{display:block}
    .label{position:absolute;left:0;right:0;bottom:1.2mm;text-align:center;font:7pt 'PT Sans',sans-serif;color:#777}</style></head><body>${body}</body></html>`;
  return { map: doc(mapPages.join("")), cards: doc(cardPages.join("")), backs: doc(backPages.join("")),
    counts: { tickets: tickets.length, wagons: wagons.length - 2, aids: 2, cardPages: cardPages.length, mapH } };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route(/telegram\.org/, r => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.goto("file://" + path.join(ROOT, "public", "index.html"));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts.ready);
  // картинки карт (вагон, паровоз, крылатое колесо) берём прямо из игры: подставляем карту на рынок и снимаем разметку
  await page.evaluate(() => {
    const C = window.__oka.Core;
    window.__oka.startLocal([{ name: "a", bot: false }, { name: "b", bot: true }]);
    document.getElementById("modal").hidden = true;
    const S = window.__oka.S(), grab = sel => document.querySelector(sel).querySelector("svg.face").outerHTML, faces = { wagon: {} };
    C.CARD_COLORS.forEach(c => { S.G.market = [c]; S.push([]); faces.wagon[c] = grab("#market [data-m='0']"); });
    S.G.market = ["loco"]; S.push([]); faces.loco = grab("#market [data-m='0']"); faces.back = grab("#market .deckBtn");
    const wheel = faces.back.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/<rect x="\.6"[^>]*\/>/, "").replace(/<rect x="3\.2"[^>]*\/>/, "");
    window.__printFaces = { wagon: c => faces.wagon[c], loco: faces.loco, backWheel: `<svg x="4" y="8" width="36" height="25" viewBox="0 0 66 46">${wheel}</svg>` };
    S.close();
    document.getElementById("modal").hidden = true;
    document.getElementById("zfit").click();   // карта целиком; перегоны свободны — партия только началась
  });
  const html = await page.evaluate(buildInPage, { A4, TILE, POSTER, CARD });
  console.log("маршрутов", html.counts.tickets, "вагонов", html.counts.wagons, "памяток", html.counts.aids, "листов карточек", html.counts.cardPages, "высота карты", html.counts.mapH, "мм");

  for (const [name, key] of [["sasovo-map-A4-3x2.pdf", "map"], ["sasovo-cards.pdf", "cards"], ["sasovo-card-backs.pdf", "backs"]]) {
    const p = await browser.newPage();
    await p.setContent(html[key], { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(OUT, name), preferCSSPageSize: true, printBackground: true });
    console.log("→ print/" + name, (fs.statSync(path.join(OUT, name)).size / 1048576).toFixed(1) + " МБ");
    await p.close();
  }
  await browser.close();
})();
