// Дорога в Сасово — игровой сервер для онлайн-режима.
// Без внешних зависимостей: Node.js 18+. Комнаты хранятся в памяти и на диске (DATA_DIR/rooms.json).
// Ходы приходят POST-запросами, обновления уходят игрокам через Server-Sent Events.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Core = require("./core.js");

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "rooms.json");
const ROOM_TTL_MS = 48 * 3600 * 1000;
const MAX_SEATS = 4;
const BOT_NAMES = ["Бот Ока", "Бот Клязьма", "Бот Цна", "Бот Пра"];

/** code → {code, created, touched, seats:[{name, bot, token}], game, conns:Set, botTimer} */
const rooms = new Map();

// ---------- хранение ----------
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const out = [...rooms.values()].map(r => ({ code: r.code, created: r.created, touched: r.touched, seats: r.seats, game: r.game }));
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE + ".tmp", JSON.stringify(out));
      fs.renameSync(DATA_FILE + ".tmp", DATA_FILE);
    } catch (e) { console.error("save failed:", e.message); }
  }, 500);
}
function load() {
  try {
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    arr.forEach(r => rooms.set(r.code, { ...r, conns: new Set(), botTimer: null }));
    console.log(`loaded ${rooms.size} rooms`);
  } catch (e) { if (e.code !== "ENOENT") console.error("load failed:", e.message); }
}

// ---------- комнаты ----------
const newToken = () => crypto.randomBytes(16).toString("hex");
function newCode() {
  for (let i = 0; i < 1000; i++) {
    const c = String(1000 + crypto.randomInt(9000));
    if (!rooms.has(c)) return c;
  }
  throw new Error("no free room codes");
}
const cleanName = n => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
const seatOf = (room, token) => room.seats.findIndex(s => !s.bot && s.token === token);
const isOnline = (room, seat) => [...room.conns].some(c => seatOf(room, c.token) === seat);

function lobbyFor(room, seat) {
  return {
    code: room.code, you: seat, isHost: seat === 0, started: !!room.game,
    seats: room.seats.map((s, i) => ({ name: s.name, bot: s.bot, online: s.bot || isOnline(room, i) })),
  };
}
function send(conn, msg) { conn.res.write(`data: ${JSON.stringify(msg)}\n\n`); }
function broadcast(room, events) {
  room.touched = Date.now();
  for (const conn of [...room.conns]) {
    const seat = seatOf(room, conn.token);
    if (seat < 0) { send(conn, { error: "Вас убрали из комнаты." }); conn.res.end(); room.conns.delete(conn); continue; }
    const msg = { lobby: lobbyFor(room, seat) };
    if (room.game) { msg.view = Core.view(room.game, seat); msg.events = Core.eventsFor(events || [], seat); }
    send(conn, msg);
  }
}
// боты ходят по одному шагу с паузой, чтобы люди успевали следить
function scheduleBot(room) {
  if (room.botTimer || !room.game) return;
  const G = room.game;
  if (G.over || G.phase !== "play" || !G.players[G.turn].bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!rooms.has(room.code) || room.game !== G) return;
    const ev = Core.botStep(G);
    broadcast(room, ev || []);
    save();
    scheduleBot(room);
  }, G.drawn ? 800 : 1000);
}

// ---------- HTTP ----------
function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > 16384) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

// раздача страницы — только для локальной проверки; на сервере её отдаёт nginx
const STATIC_DIR = process.env.STATIC_DIR || "";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
function serveStatic(url, res) {
  const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.join(STATIC_DIR, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ""));
  if (!file.startsWith(path.resolve(STATIC_DIR))) return json(res, 403, { error: "Нет доступа." });
  fs.readFile(file, (err, buf) => {
    if (err) return json(res, 404, { error: "Не найдено." });
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(buf);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  if (STATIC_DIR && !url.pathname.startsWith("/api/")) return serveStatic(url, res);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);

  if (req.method === "GET" && parts[0] === "health") return json(res, 200, { ok: true, rooms: rooms.size });

  // создать комнату
  if (req.method === "POST" && parts.length === 1 && parts[0] === "rooms") {
    const body = await readBody(req);
    const name = cleanName(body.name);
    if (!name) return json(res, 400, { error: "Введите имя." });
    const code = newCode(), token = newToken();
    rooms.set(code, { code, created: Date.now(), touched: Date.now(), seats: [{ name, bot: false, token }], game: null, conns: new Set(), botTimer: null });
    save();
    return json(res, 200, { code, token });
  }

  if (parts[0] !== "rooms" || !parts[1]) return json(res, 404, { error: "Не найдено." });
  const room = rooms.get(parts[1]);
  if (!room) return json(res, 404, { error: "Такой комнаты нет или она уже закрыта." });
  const cmd = parts[2];

  // поток обновлений для игрока
  if (req.method === "GET" && cmd === "events") {
    const token = url.searchParams.get("token") || "";
    const seat = seatOf(room, token);
    res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no", connection: "keep-alive" });
    if (seat < 0) { send({ res }, { error: "Вас нет в этой комнате. Попросите новую ссылку или создайте свою игру." }); return res.end(); }
    res.write("retry: 3000\n\n");
    const conn = { res, token };
    room.conns.add(conn);
    const ping = setInterval(() => res.write(": ping\n\n"), 20000);
    req.on("close", () => { clearInterval(ping); room.conns.delete(conn); broadcast(room, []); });
    broadcast(room, []);
    return;
  }

  if (req.method !== "POST") return json(res, 405, { error: "Метод не поддерживается." });
  const body = await readBody(req);

  if (cmd === "join") {
    const name = cleanName(body.name);
    if (!name) return json(res, 400, { error: "Введите имя." });
    if (room.game) return json(res, 409, { error: "Игра в этой комнате уже началась." });
    if (room.seats.length >= MAX_SEATS) return json(res, 409, { error: "В комнате уже 4 игрока." });
    const token = newToken();
    room.seats.push({ name, bot: false, token });
    broadcast(room, []); save();
    return json(res, 200, { token });
  }

  const seat = seatOf(room, body.token || "");
  if (seat < 0) return json(res, 403, { error: "Вас нет в этой комнате." });

  if (cmd === "leave") {
    if (!room.game && seat === 0) {
      for (const c of room.conns) { send(c, { error: "Создатель закрыл комнату." }); c.res.end(); }
      clearTimeout(room.botTimer); rooms.delete(room.code); save();
      return json(res, 200, { ok: true });
    }
    for (const c of [...room.conns]) if (c.token === body.token) { c.res.end(); room.conns.delete(c); }
    if (!room.game) room.seats.splice(seat, 1);   // во время игры место остаётся: можно вернуться по ссылке
    broadcast(room, []); save();
    return json(res, 200, { ok: true });
  }

  if (cmd === "action") {
    if (!room.game) return json(res, 409, { error: "Игра ещё не началась." });
    const r = Core.act(room.game, seat, body.action || {});
    if (!r.ok) return json(res, 400, { error: r.error });
    broadcast(room, r.events); save(); scheduleBot(room);
    return json(res, 200, { ok: true });
  }

  // команды создателя комнаты
  if (seat !== 0) return json(res, 403, { error: "Это может сделать только создатель комнаты." });
  if (room.game) return json(res, 409, { error: "Игра уже идёт." });
  if (cmd === "bot") {
    if (room.seats.length >= MAX_SEATS) return json(res, 409, { error: "В комнате уже 4 игрока." });
    const used = new Set(room.seats.map(s => s.name));
    room.seats.push({ name: BOT_NAMES.find(n => !used.has(n)) || "Бот", bot: true, token: null });
  } else if (cmd === "remove") {
    const i = Number(body.seat);
    if (!(i > 0 && i < room.seats.length)) return json(res, 400, { error: "Нет такого места." });
    room.seats.splice(i, 1);   // его подключение получит сообщение об этом при рассылке
  } else if (cmd === "start") {
    if (room.seats.length < 2) return json(res, 409, { error: "Нужно минимум 2 игрока." });
    const r = Core.createGame(room.seats.map(s => ({ name: s.name, bot: s.bot })));
    room.game = r.G;
    broadcast(room, r.events); scheduleBot(room);
  } else return json(res, 404, { error: "Неизвестная команда." });
  broadcast(room, []); save();
  return json(res, 200, { ok: true });
}
const server = http.createServer((req, res) => {
  handle(req, res).catch(e => {
    console.error(e);
    if (!res.headersSent) json(res, 400, { error: "Некорректный запрос." }); else res.end();
  });
});

load();
for (const room of rooms.values()) scheduleBot(room);
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) if (now - r.touched > ROOM_TTL_MS && !r.conns.size) { clearTimeout(r.botTimer); rooms.delete(code); }
  save();
}, 3600 * 1000);
server.listen(PORT, HOST, () => console.log(`Дорога в Сасово: сервер на http://${HOST}:${PORT}`));
