// Telegram: проверка initData мини-приложения, уведомления «Ваш ход», ответ на /start.
// Работает, только если заданы переменные окружения BOT_TOKEN, BOT_USERNAME, APP_NAME, PUBLIC_URL.
"use strict";
const crypto = require("crypto");

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BOT_USERNAME = (process.env.BOT_USERNAME || "").replace(/^@/, "");
const APP_NAME = process.env.APP_NAME || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
const enabled = !!(BOT_TOKEN && PUBLIC_URL);
const INIT_DATA_MAX_AGE = 7 * 24 * 3600; // секунд

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData) {
  if (!enabled || !initData || typeof initData !== "string") return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calc = crypto.createHmac("sha256", secret).update(check).digest("hex");
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date")) || 0;
  if (Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE) return null;
  try {
    const user = JSON.parse(params.get("user") || "null");
    if (!user || !user.id) return null;
    return { id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(" ") };
  } catch (e) { return null; }
}

async function api(method, body) {
  if (!enabled) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}),
    });
    const j = await r.json();
    if (!j.ok && method !== "getUpdates") console.warn(`telegram ${method}:`, j.description);
    return j.ok ? j.result : null;
  } catch (e) { console.warn(`telegram ${method}:`, e.message); return null; }
}

const roomUrl = code => `${PUBLIC_URL}/#room-${code}`;
const appLink = code => BOT_USERNAME && APP_NAME ? `https://t.me/${BOT_USERNAME}/${APP_NAME}${code ? `?startapp=room-${code}` : ""}` : "";
const openButton = (text, code) => ({ inline_keyboard: [[{ text, web_app: { url: code ? roomUrl(code) : PUBLIC_URL + "/" } }]] });

function notify(tgId, text, code, buttonText) {
  if (!enabled || !tgId) return;
  api("sendMessage", { chat_id: tgId, text, reply_markup: openButton(buttonText || "Открыть игру", code) });
}

// /start и /start room-1234 — кнопка, открывающая игру (или нужную комнату)
let offset = 0, polling = false;
async function poll() {
  if (!enabled || polling) return;
  polling = true;
  for (;;) {
    const updates = await api("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] });
    if (!updates) { await new Promise(r => setTimeout(r, 5000)); continue; }
    for (const u of updates) {
      offset = u.update_id + 1;
      const m = u.message;
      if (!m || !m.text || !m.chat || m.chat.type !== "private") continue;
      const arg = (m.text.match(/^\/start(?:@\w+)?\s+(\S+)/) || [])[1] || "";
      const code = (arg.match(/^room-(\d{4,6})$/) || [])[1] || "";
      if (/^\/start/.test(m.text)) {
        api("sendMessage", {
          chat_id: m.chat.id,
          text: code
            ? `Вас позвали в комнату ${code}. Нажмите кнопку, чтобы войти.`
            : "«Дорога в Сасово» — железнодорожная стратегия по Подмосковью, Мещёре и Рязанщине.\n\nИграйте с ботами или позовите друзей: создайте комнату и нажмите «Пригласить из Telegram». Когда наступит ваш ход, я напишу сюда.",
          reply_markup: openButton(code ? `Войти в комнату ${code}` : "Играть", code),
        });
      }
    }
  }
}

function start() {
  if (!enabled) { console.log("Telegram выключен: не заданы BOT_TOKEN и PUBLIC_URL"); return; }
  api("setChatMenuButton", { menu_button: { type: "web_app", text: "Играть", web_app: { url: PUBLIC_URL + "/" } } });
  api("setMyCommands", { commands: [{ command: "start", description: "Открыть игру" }] });
  poll();
  console.log(`Telegram включён: @${BOT_USERNAME || "?"}${APP_NAME ? "/" + APP_NAME : ""}`);
}

module.exports = { enabled, verifyInitData, notify, appLink, start, BOT_USERNAME, APP_NAME };
