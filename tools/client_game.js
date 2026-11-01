// =====================================================================
// GAME CLIENT: один вид состояния (V) для игры на одном устройстве и онлайн
// =====================================================================
let V=null;            // что видит этот экран (SasovoCore.view)
let S=null;            // сессия: local | online
let mode="game";       // "game" | "map"
let hl={keys:new Set(),ends:new Set()};
let freshTrack={id:-1,ts:0};
let resultsShown=false, ticketModalOpen=false;
const API="/api";
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};

const canAct=()=>!!V&&V.phase==="play"&&!V.over&&V.me!=null&&V.turn===V.me&&!V.pending&&$("modal").hidden;
const meP=()=>V&&V.me!=null?V.players[V.me]:null;

// ----- анимации -----
const reduceMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const rectOf=sel=>{const e=document.querySelector(sel);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return r.width?r:null};
function fly(f){
  const row=document.querySelector(`#players [data-pi="${f.pi}"]`);if(row){row.classList.remove("got");void row.offsetWidth;row.classList.add("got")}
  const to=(f.pi===V.me&&rectOf("#hand"))||rectOf(`#players [data-pi="${f.pi}"]`)||rectOf(`#bplayers [data-pi="${f.pi}"]`);
  if(!to||reduceMotion())return;
  const d=document.createElement("div");d.className="fly";d.innerHTML=f.card==null?backFace:f.card==="loco"?locoFace:wagonFace(f.card);
  d.style.left=f.src.left+"px";d.style.top=f.src.top+"px";document.body.appendChild(d);
  const dx=to.left+Math.min(to.width/2,120)-33-f.src.left,dy=to.top+to.height/2-23-f.src.top;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{d.style.transform=`translate(${dx}px,${dy}px) scale(.55)`;d.style.opacity=".15"}));
  setTimeout(()=>d.remove(),800);
}
let toastT;
function toast(p,text){
  const t=$("toast");t.innerHTML=`<i style="background:${p.color}"></i><span><b>${esc(p.name)}</b> ${esc(text)}</span>`;t.hidden=false;
  clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);
}

// новый вид + события → анимации и перерисовка
function update(newV,events){
  events=events||[];
  const flies=[];
  events.forEach(e=>{if(e.type==="draw"){const src=e.src==="market"?rectOf(`#market [data-m="${e.i}"]`):rectOf("#deckBtn");if(src)flies.push({pi:e.pi,src,card:e.card})}});
  const prevOver=V&&V.over;
  V=newV;
  if(!V.over)resultsShown=false;
  events.forEach(e=>{
    const p=V.players[e.pi];
    if(e.type==="claim"){freshTrack={id:e.track,ts:Date.now()};const t=tracks[e.track];toast(p,`строит ${cities[t.a].n} — ${cities[t.b].n}: ${t.cars} ваг., +${e.pts}`)}
    else if(e.type==="tickets"&&!e.start)toast(p,`берёт маршруты: оставляет ${e.kept} из ${e.offered}`);
    else if(e.type==="draw"&&e.pi!==V.me)toast(p,e.src==="market"&&e.card==="loco"?"берёт тепловоз с рынка":"берёт карты");
    else if(e.type==="final")toast(p,"— последний круг: у всех по одному ходу");
    else if(e.type==="ticketDone"&&e.pi===V.me)flash(`Маршрут выполнен: ${e.name} (+${e.pts})`);
  });
  render();
  flies.forEach(fly);
  afterUpdate(prevOver);
}
function afterUpdate(){
  if(V.over&&V.results&&!resultsShown&&$("modal").hidden){resultsShown=true;showResults();return}
  if(V.pending&&!ticketModalOpen&&$("modal").hidden){showTicketChoice(V.pending);return}
  if(S&&S.afterUpdate)S.afterUpdate();
}

// ----- игра на одном устройстве (боты и живые игроки по очереди) -----
function LocalSession(cfg){
  const r=Core.createGame(cfg);
  const s={kind:"local",G:r.G,humans:cfg.map((c,i)=>c.bot?-1:i).filter(i=>i>=0),revealed:null,setupPi:null,timer:null,passing:false};
  s.multi=s.humans.length>1;
  s.viewer=()=>{const G=s.G;if(!s.multi)return s.humans.length?s.humans[0]:null;
    if(G.phase==="setup")return s.setupPi;return s.humans.includes(G.turn)&&s.revealed===G.turn?G.turn:null};
  s.push=ev=>{const v=s.viewer();update(Core.view(s.G,v),Core.eventsFor(ev||[],v))};
  s.send=a=>{const G=s.G,pi=G.phase==="setup"?s.viewer():G.turn;if(pi==null)return;
    const res=Core.act(G,pi,a);if(!res.ok){flash(res.error);return}s.push(res.events)};
  s.afterUpdate=()=>{
    const G=s.G;if(G.over||!$("modal").hidden||s.passing)return;
    if(G.phase==="setup"){
      if(s.setupPi!=null&&G.pending[s.setupPi])return;
      const next=s.humans.find(i=>G.pending[i]);if(next===undefined)return;
      if(!s.multi){s.setupPi=next;s.push([]);return}
      s.setupPi=null;s.passing=true;showPass(G.players[next],()=>{s.passing=false;s.setupPi=next;s.push([])});return;
    }
    const cur=G.players[G.turn];
    if(cur.bot){if(!s.timer){const g0=G;s.timer=setTimeout(()=>{s.timer=null;if(S!==s||s.G!==g0)return;const ev=Core.botStep(G);s.push(ev||[])},G.drawn?800:950)}return}
    if(s.multi&&s.revealed!==G.turn){s.passing=true;showPass(cur,()=>{s.passing=false;s.revealed=G.turn;s.push([])})}
  };
  s.close=()=>{clearTimeout(s.timer)};
  return s;
}

// ----- онлайн: сервер ведёт игру, страница только показывает и отправляет ходы -----
function OnlineSession(code,token){
  const s={kind:"online",code,token,lobby:null,es:null,closed:false};
  s.connect=()=>{
    s.es=new EventSource(`${API}/rooms/${code}/events?token=${encodeURIComponent(token)}`);
    s.es.onopen=()=>setConn(true);
    s.es.onerror=()=>{setConn(false)};
    s.es.onmessage=m=>{let d;try{d=JSON.parse(m.data)}catch(e){return}
      if(d.error){s.close();store.del("sasovo:room:"+code);openModal(`<h3>Комната ${esc(code)}</h3><p>${esc(d.error)}</p><div class="row"><button class="primary" id="eBack">К выбору игры</button></div>`);$("eBack").onclick=()=>{location.hash="";showSetup()};return}
      s.lobby=d.lobby;
      if(d.view){if(lobbyOpen){lobbyOpen=false;$("modal").hidden=true}update(d.view,d.events)}
      else showLobby(s);
    };
  };
  s.post=async(path,body)=>{
    try{const r=await fetch(`${API}/rooms/${code}/${path}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,...body})});
      const j=await r.json().catch(()=>({}));if(!r.ok||j.error){flash(j.error||"Сервер не ответил.");return null}return j}
    catch(e){flash("Нет связи с сервером.");return null}
  };
  s.send=a=>s.post("action",{action:a});
  s.close=()=>{s.closed=true;if(s.es)s.es.close()};
  return s;
}
function setConn(ok){const c=$("conn");if(!c)return;c.hidden=!S||S.kind!=="online";c.textContent=ok?"в сети":"нет связи…";c.className="conn"+(ok?"":" off")}
async function apiPost(path,body){
  try{const r=await fetch(API+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));return r.ok?j:{error:j.error||"Сервер не ответил."}}
  catch(e){return {error:"Нет связи с сервером."}}
}
function startLocal(cfg){if(S&&S.close)S.close();location.hash="";S=LocalSession(cfg);resultsShown=false;S.push([])}
function startOnline(code,token){
  if(S&&S.close)S.close();store.set("sasovo:room:"+code,token);location.hash="room-"+code;
  V=null;resultsShown=false;S=OnlineSession(code,token);S.connect();setConn(true);render();
}
let onlineAvailable=false;
async function checkOnline(){
  try{const c=new AbortController();setTimeout(()=>c.abort(),3000);const r=await fetch(API+"/health",{signal:c.signal});onlineAvailable=r.ok}catch(e){onlineAvailable=false}
}
