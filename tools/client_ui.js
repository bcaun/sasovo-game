// =====================================================================
// RENDER: SIDEBAR (GAME)
// =====================================================================
function render(){
  redrawMap();
  if(!V){
    $("turnTitle").textContent=S&&S.kind==="online"?`Комната ${S.code}`:"Дорога в Сасово";
    $("status").textContent=S&&S.kind==="online"?"Ждём начала игры.":"Выберите режим игры.";
    ["players","market","hand","myTickets","log","bplayers"].forEach(id=>$(id).innerHTML="");
    $("deckInfo").textContent="";$("handCount").textContent="";$("tCount").textContent="";$("btnTickets").disabled=true;return;
  }
  const p=V.players[V.turn],me=meP();
  $("turnTitle").innerHTML=V.over?"Игра окончена":V.phase==="setup"?"Выбор маршрутов":`Ход: <span style="color:${p.color}">${esc(p.name)}</span>${p.bot?" (бот)":""}${V.turn===V.me?" — ваш ход":""}`;
  let st="";
  if(V.over)st="Нажмите «Новая игра», чтобы сыграть ещё раз.";
  else if(V.phase==="setup")st="Игроки выбирают стартовые маршруты: "+V.players.filter(q=>q.choosing).map(q=>q.name).join(", ")+".";
  else if(V.me==null)st=p.bot?"Ходит бот…":`Передайте устройство: ходит ${p.name}.`;
  else if(V.turn!==V.me)st=p.bot?`Ходит ${/^бот/i.test(p.name)?"":"бот "}${p.name}…`:`Ходит ${p.name}. Ждём его хода.`;
  else if(V.pending)st="Выберите маршруты.";
  else if(V.drawn===1)st="Возьмите вторую карту: из колоды или с рынка (кроме тепловоза).";
  else st="Возьмите 2 карты, постройте перегон (подсвечены доступные) или возьмите маршруты.";
  if(V.finalLeft!==null&&!V.over)st+=` Последний круг: ходов осталось ${V.finalLeft}.`;
  $("status").textContent=st;
  $("hint").textContent=mode==="game"?(V.over?"Игра окончена. Наведите на перегон, чтобы увидеть владельца.":"Нажмите перегон, чтобы построить. Наведите, чтобы увидеть цену."):"Нажмите два города, чтобы проложить путь.";
  $("bplayers").innerHTML=V.players.map((q,i)=>`<div data-pi="${i}" class="${i===V.turn&&!V.over?"cur":""}"><i style="background:${q.color}"></i>${esc(q.name)} <b>${q.score}</b></div>`).join("");
  $("players").innerHTML=V.players.map((q,i)=>`<div data-pi="${i}" class="pl${i===V.turn&&!V.over?" cur":""}"><i style="background:${q.color}"></i>
    <span>${esc(q.name)}${i===V.me?" (вы)":""}${q.bot?" · бот":""}</span><span class="num" title="Очки за перегоны"><b>${q.score}</b> оч</span>
    <span class="num" title="Вагонов осталось"><b>${q.cars}</b> ваг</span><span class="num" title="Карт в руке · маршрутов">${q.cards} к · ${q.ticketCount} м</span></div>`).join("");
  const act=canAct();
  $("market").innerHTML=V.market.map((c,i)=>cardHTML(c,null,`data-m="${i}" ${!act||(c==="loco"&&V.drawn>0)?'aria-disabled="true"':""}`)).join("")
    +`<button class="card back" id="deckBtn" ${!act||(!V.deck&&!V.discard)?'aria-disabled="true"':""} aria-label="Взять из колоды, карт: ${V.deck}">${backFace}<b>${V.deck}</b></button>`;
  $("deckInfo").textContent=`колода ${V.deck} · сброс ${V.discard}`;
  $("market").querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>takeMarket(+b.dataset.m));
  $("deckBtn").onclick=takeDeck;
  $("log").innerHTML=V.log.map(l=>`<div>${l}</div>`).join("");
  if(!me){
    $("handTitle").textContent="Рука скрыта";$("handCount").textContent="";
    $("hand").innerHTML=`<span class="status">${p.bot?"Ходит бот.":`Ждём, пока ${esc(p.name)} откроет свои карты.`}</span>`;
    $("tCount").textContent="";$("myTickets").innerHTML=`<span class="status">Маршруты видит только игрок, чей ход.</span>`;
    $("btnTickets").disabled=true;return;
  }
  $("handTitle").textContent=S&&S.kind==="local"&&S.multi?`Рука: ${me.name}`:"Ваша рука";
  const keys=[...CARD_COLORS,"loco"].filter(k=>me.hand[k]>0);
  $("hand").innerHTML=keys.length?keys.map(k=>cardHTML(k,me.hand[k],'tabindex="-1"')).join(""):`<span class="status">Карт нет.</span>`;
  $("hand").querySelectorAll(".card").forEach(b=>b.classList.add("static"));
  $("handCount").textContent=me.cards+" карт";
  $("btnTickets").disabled=!act||V.drawn>0||!V.ticketsLeft;
  const done=me.tickets.filter(t=>t.done).length;
  $("tCount").textContent=`${done}/${me.tickets.length}`;
  $("myTickets").innerHTML=me.tickets.length?me.tickets.map((t,i)=>ticketHTML(t,"",`data-t="${i}"`)).join(""):`<span class="status">Маршрутов пока нет.</span>`;
  $("myTickets").querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{const t=me.tickets[+b.dataset.t];setHL(shortest(t.a,t.b))});
}
let flashT;
function flash(msg){const h=$("hint");h.textContent=msg;clearTimeout(flashT);flashT=setTimeout(()=>render(),2600)}

// ----- действия игрока -----
function takeMarket(i){if(!canAct())return;const c=V.market[i];if(c==="loco"&&V.drawn>0){flash("Тепловоз с рынка можно взять только первой картой.");return}S.send({type:"market",i})}
function takeDeck(){if(!canAct())return;S.send({type:"deck"})}
function takeTicketsAction(){if(!canAct()||V.drawn>0)return;S.send({type:"tickets"})}
function onTrackClick(id){
  if(mode!=="game"||!V)return;
  const t=tracks[id];
  if(!canAct()){if(V.phase==="play"&&!V.over)flash(V.me==null||V.turn!==V.me?"Сейчас не ваш ход.":"Сначала завершите выбор.");return}
  if(V.drawn>0){flash("Вы уже взяли карту — возьмите вторую.");return}
  const r=trackBlockReason(V,V.me,t);if(r){flash(r);return}
  if(!payOptions(meP().hand,t).length){flash(`Нужно ${cardCost(t)} карт ${t.color==="gray"?"одного цвета":"цвета «"+COLORS[t.color][1]+"»"} (тепловозы подходят).`);return}
  showPay(t);
}

// =====================================================================
// MODALS
// =====================================================================
let lobbyOpen=false;
function openModal(html){$("dialog").innerHTML=html;$("modal").hidden=false}
function closeModal(){$("modal").hidden=true;lobbyOpen=false;render();if(V)afterUpdate()}

function showSetup(){
  const def=[["Игрок 1",false],["Бот Ока",true],["Бот Клязьма",true],["Игрок 4",false]];
  const myName=store.get("sasovo:name")||"";
  openModal(`<h3>Новая игра</h3>
   <p>Соединяйте города из своих маршрутов. От Москвы до Сасово ведут три пути: основная магистраль, запасной путь и северный ход через Владимир.</p>
   <div class="tabs" role="tablist"><button role="tab" id="mLocal" aria-selected="true">На этом устройстве</button><button role="tab" id="mOnline" aria-selected="false">Онлайн с друзьями</button></div>
   <div id="pLocal" style="display:flex;flex-direction:column;gap:10px">
     <p>С ботами или с друзьями за одним устройством. Снимите галочку «бот», и перед каждым ходом игра попросит передать устройство.</p>
     <label class="row">Игроков: <select id="sN"><option>2</option><option selected>3</option><option>4</option></select></label>
     <div id="sRows" style="display:flex;flex-direction:column;gap:6px"></div>
     <div class="row"><button class="primary" id="sGo">Начать</button></div>
   </div>
   <div id="pOnline" hidden style="display:flex;flex-direction:column;gap:10px">
     <p>Каждый играет со своего телефона или компьютера. Создайте комнату и отправьте друзьям ссылку. Свободные места можно отдать ботам.</p>
     <label class="row">Ваше имя: <input type="text" id="oName" maxlength="24" value="${esc(myName)}" placeholder="например, Саша"></label>
     <div class="row"><button class="primary" id="oCreate">Создать комнату</button><span class="status" id="oErr"></span></div>
     <p class="status" id="oNote"></p>
   </div>`);
  const rows=()=>{const n=+$("sN").value;$("sRows").innerHTML=def.slice(0,n).map(([nm,b],i)=>`<div class="setup-row"><i style="background:${PLAYER_COLORS[i]}"></i>
      <input type="text" id="sName${i}" value="${esc(nm)}" maxlength="24" aria-label="Имя игрока ${i+1}"><label><input type="checkbox" id="sBot${i}" ${b?"checked":""}> бот</label></div>`).join("")};
  rows();$("sN").onchange=rows;
  const tab=on=>{$("mLocal").setAttribute("aria-selected",!on);$("mOnline").setAttribute("aria-selected",on);$("pLocal").hidden=on;$("pOnline").hidden=!on};
  $("mLocal").onclick=()=>tab(false);$("mOnline").onclick=()=>tab(true);
  if(!onlineAvailable){$("oCreate").disabled=true;$("oNote").textContent="Онлайн-игра работает на сайте игры, когда на сервере запущен игровой сервер. Здесь он недоступен."}
  $("sGo").onclick=()=>{const n=+$("sN").value;const cfg=[];for(let i=0;i<n;i++)cfg.push({name:$("sName"+i).value.trim()||"Игрок "+(i+1),bot:$("sBot"+i).checked});
    $("modal").hidden=true;startLocal(cfg)};
  $("oCreate").onclick=async()=>{const name=$("oName").value.trim();if(!name){$("oErr").textContent="Введите имя.";return}
    store.set("sasovo:name",name);$("oCreate").disabled=true;const j=await apiPost("/rooms",{name});$("oCreate").disabled=false;
    if(j.error){$("oErr").textContent=j.error;return}$("modal").hidden=true;startOnline(j.code,j.token)};
}
function showJoin(code){
  const myName=store.get("sasovo:name")||"";
  openModal(`<h3>Комната ${esc(code)}</h3><p>Вас пригласили в игру «Дорога в Сасово». Как вас подписать?</p>
   <label class="row">Ваше имя: <input type="text" id="jName" maxlength="24" value="${esc(myName)}"></label>
   <div class="row"><button class="primary" id="jGo">Войти в комнату</button><button id="jCancel">Своя игра</button><span class="status" id="jErr"></span></div>`);
  $("jGo").onclick=async()=>{const name=$("jName").value.trim();if(!name){$("jErr").textContent="Введите имя.";return}
    store.set("sasovo:name",name);$("jGo").disabled=true;const j=await apiPost(`/rooms/${code}/join`,{name});$("jGo").disabled=false;
    if(j.error){$("jErr").textContent=j.error;return}$("modal").hidden=true;startOnline(code,j.token)};
  $("jCancel").onclick=()=>{location.hash="";showSetup()};
}
function showLobby(s){
  const L=s.lobby;if(!L)return;
  const link=location.origin+location.pathname+"#room-"+L.code;
  const host=L.seats[0];
  const html=`<h3>Комната ${esc(L.code)}</h3>
   <p>Отправьте друзьям ссылку. Можно играть вдвоём, втроём или вчетвером, свободные места можно отдать ботам.</p>
   <div class="row"><input type="text" id="lLink" readonly value="${esc(link)}" style="flex:1;min-width:0"><button id="lCopy">Скопировать</button></div>
   <div class="players">${L.seats.map((q,i)=>`<div class="pl"><i style="background:${PLAYER_COLORS[i]}"></i>
     <span>${esc(q.name)}${i===L.you?" (вы)":""}${i===0?" · создатель":""}${q.bot?" · бот":""}</span>
     <span class="num">${q.bot?"":q.online?"в сети":"не в сети"}</span><span></span>
     <span>${L.isHost&&i>0?`<button data-rm="${i}" style="padding:1px 8px" aria-label="Убрать">×</button>`:""}</span></div>`).join("")}</div>
   ${L.isHost?`<div class="row"><button id="lBot" ${L.seats.length>=4?"disabled":""}>Добавить бота</button>
     <button class="primary" id="lStart" ${L.seats.length<2?"disabled":""}>Начать игру</button></div>
     <p class="status">${L.seats.length<2?"Нужно минимум 2 игрока: дождитесь друга или добавьте бота.":"Когда все соберутся, нажмите «Начать игру»."}</p>`
   :`<p class="status">Ждём, пока ${esc(host.name)} начнёт игру.</p>`}
   <div class="row"><button id="lLeave">Выйти из комнаты</button></div>`;
  openModal(html);lobbyOpen=true;
  $("lCopy").onclick=()=>{const i=$("lLink");navigator.clipboard?navigator.clipboard.writeText(i.value).then(()=>{$("lCopy").textContent="Скопировано"},()=>{i.select()}):i.select()};
  if(L.isHost){$("lBot").onclick=()=>s.post("bot",{});$("lStart").onclick=()=>s.post("start",{});
    $("dialog").querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>s.post("remove",{seat:+b.dataset.rm}))}
  $("lLeave").onclick=()=>{s.post("leave",{});s.close();store.del("sasovo:room:"+L.code);S=null;V=null;lobbyOpen=false;location.hash="";render();showSetup()};
}
function showPass(p,go){
  openModal(`<h3>Передайте ход: <span style="color:${p.color}">${esc(p.name)}</span></h3>
   <p>Рука и маршруты скрыты, пока ${esc(p.name)} не нажмёт кнопку. Остальным лучше не смотреть.</p>
   <div class="row"><button class="primary" id="passGo">Я ${esc(p.name)}, показать мои карты</button></div>`);
  $("passGo").onclick=()=>{$("modal").hidden=true;go()};
}
function showTicketChoice(pend){
  const offer=pend.offer,min=pend.min,sel=new Set();ticketModalOpen=true;
  const hasLong=offer.some(t=>t.long);
  openModal(`<h3>${esc(meP().name)}: ${pend.start?"стартовые маршруты":"новые маршруты"}</h3>
   <p>Нажмите на билеты, которые оставляете: от ${min} до ${offer.length}. Выполненный билет в конце приносит его очки, невыполненный столько же отнимает.</p>
   ${hasLong?`<p><b>Дальний маршрут</b> можно взять только сейчас. Если отказаться, он уйдёт из игры, и добрать его потом будет нельзя.</p>`:""}
   <div class="tlist" id="offer" style="max-height:none">${offer.map((t,i)=>ticketHTML(t," pick",`data-o="${i}" aria-pressed="false"`)).join("")}</div>
   <div class="row"><button class="primary" id="oOk" disabled>Оставить выбранные</button><span class="status num" id="oMsg"></span></div>`);
  const upd=()=>{$("oOk").disabled=sel.size<min;$("oMsg").textContent=`выбрано ${sel.size} из ${offer.length}, минимум ${min}`};upd();
  $("offer").querySelectorAll("[data-o]").forEach(b=>{
    b.onclick=()=>{const i=+b.dataset.o;sel.has(i)?sel.delete(i):sel.add(i);b.setAttribute("aria-pressed",sel.has(i));upd()};
    b.onmouseenter=()=>{const t=offer[+b.dataset.o];setHL(shortest(t.a,t.b))};
  });
  $("oOk").onclick=()=>{if(sel.size<min)return;$("modal").hidden=true;ticketModalOpen=false;clearHL();S.send({type:"keep",idx:[...sel]})};
}
function showPay(t){
  const opts=payOptions(meP().hand,t),A=cities[t.a],B=cities[t.b];
  const label=o=>{const parts=[];if(o.use)parts.push(`${o.use} × ${COLORS[o.c][1]}`);if(o.loco)parts.push(`${o.loco} × тепловоз`);return parts.join(" + ")};
  openModal(`<h3>${esc(A.n)} — ${esc(B.n)}</h3>
   <p>${t.cars} ваг. · ${TYPES[t.type].name} · ${trackPoints(t)} очков. ${t.type==="exp"?`Скоростная: нужно ${cardCost(t)} карт, ставите ${t.cars} вагонов.`:""} ${t.color==="gray"?"Подходят карты любого одного цвета.":""}</p>
   <div class="paybtns">${opts.map((o,i)=>`<button data-p="${i}"><em style="background:${o.c==="loco"?"#999":COLORS[o.c][0]}"></em>${label(o)}</button>`).join("")}</div>
   <div class="row"><button id="pCancel">Отмена</button></div>`);
  $("dialog").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{$("modal").hidden=true;S.send({type:"claim",track:t.id,opt:+b.dataset.p})});
  $("pCancel").onclick=closeModal;
}
function showResults(){
  const rows=V.results;
  openModal(`<h3>Итоги: побеждает ${esc(rows[0].name)}</h3>
   <div class="tablewrap"><table class="res"><tr><th>Игрок</th><th>Перегоны</th><th>Маршруты +</th><th>Маршруты −</th><th>ЦКАД</th><th>БМО</th><th>Длинный путь</th><th>Итого</th></tr>
   ${rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="num">${r.route}</td><td class="num">+${r.tp}</td><td class="num">−${r.tm}</td>
     <td class="num">${r.ck} → +${r.bCk}</td><td class="num">${r.bm} → +${r.bBm}</td><td class="num">${r.lt} → +${r.bLt}</td><td class="num"><b>${r.total}</b></td></tr>`).join("")}
   </table></div><div class="row"><button class="primary" id="mNew">Новая игра</button><button id="mClose">Посмотреть карту</button></div>`);
  $("mNew").onclick=()=>{$("modal").hidden=true;newGameClick()};$("mClose").onclick=closeModal;
}
function newGameClick(){
  if(S&&S.kind==="online"){store.del("sasovo:room:"+S.code);S.close()}
  else if(S&&S.close)S.close();
  S=null;V=null;location.hash="";render();showSetup();
}
