// Сгенерировано tools/build.py из tools/core.js — не редактируйте вручную.
// Дорога в Сасово — игровое ядро: карта, правила, боты, видимость состояния.
// Работает и в браузере (window.SasovoCore), и на сервере (require).
// Данные карты подставляет tools/build.py вместо маркера DATA.
(function(root){
"use strict";

// ---------- проекция: равнопромежуточная + лёгкая «линза» вокруг Москвы ----------
const K=260, C=Math.cos(55*Math.PI/180);
const raw=(lon,lat)=>[(lon-35)*K*C,(57.1-lat)*K];
const [MX,MY]=raw(37.62,55.75);
const P=(lon,lat)=>{const [x,y]=raw(lon,lat),dx=x-MX,dy=y-MY,r=Math.hypot(dx,dy),f=1+0.6*Math.exp(-r/120);
  return [ +(MX+dx*f).toFixed(1), +(MY+dy*f).toFixed(1) ]};
const UNIT=40;

const CITY_DATA=[
 ["msk", "Москва", 37.62, 55.75, "M", 1],
 ["push", "Пушкино", 37.85, 56.01, "M"],
 ["sp", "Сергиев Посад", 38.13, 56.31, "M"],
 ["kra", "Красноармейск", 38.14, 56.1, "M"],
 ["dmi", "Дмитров", 37.52, 56.34, "M"],
 ["dub", "Дубна", 37.17, 56.74, "M"],
 ["sol", "Солнечногорск", 36.98, 56.18, "M"],
 ["klin", "Клин", 36.73, 56.33, "M"],
 ["ist", "Истра", 36.86, 55.92, "M"],
 ["zven", "Звенигород", 36.86, 55.73, "M"],
 ["vol", "Волоколамск", 35.95, 56.03, "M"],
 ["shah", "Шаховская", 35.51, 56.03, "M"],
 ["ruza", "Руза", 36.19, 55.7, "M"],
 ["moz", "Можайск", 36.03, 55.51, "M"],
 ["kub", "Кубинка", 36.7, 55.58, "M"],
 ["odi", "Одинцово", 37.28, 55.68, "M"],
 ["nf", "Наро-Фоминск", 36.73, 55.39, "M"],
 ["pod", "Подольск", 37.55, 55.43, "M"],
 ["che", "Чехов", 37.48, 55.14, "M"],
 ["ser", "Серпухов", 37.41, 54.92, "M"],
 ["dom", "Домодедово", 37.77, 55.44, "M"],
 ["mihn", "Михнево", 37.95, 55.13, "M"],
 ["kash", "Кашира", 38.15, 54.84, "M"],
 ["ozy", "Озёры", 38.56, 54.86, "M"],
 ["kol", "Коломна", 38.78, 55.1, "M", 1],
 ["vos", "Воскресенск", 38.68, 55.32, "M"],
 ["bron", "Бронницы", 38.26, 55.42, "M"],
 ["ram", "Раменское", 38.23, 55.57, "M"],
 ["lyu", "Люберцы", 37.89, 55.68, "M"],
 ["nog", "Ногинск", 38.44, 55.85, "M"],
 ["oz", "Орехово-Зуево", 38.98, 55.8, "M"],
 ["kur", "Куровское", 38.92, 55.58, "M"],
 ["eg", "Егорьевск", 39.03, 55.38, "M"],
 ["sha", "Шатура", 39.54, 55.58, "M"],
 ["luh", "Луховицы", 39.03, 54.97, "M"],
 ["zar", "Зарайск", 38.88, 54.76, "M"],
 ["sprud", "Серебряные Пруды", 38.71, 54.47, "M"],
 ["alx", "Александров", 38.71, 56.4, "V"],
 ["vla", "Владимир", 40.4, 56.13, "V", 1],
 ["gus", "Гусь-Хрустальный", 40.66, 55.62, "V"],
 ["mur", "Муром", 42.04, 55.58, "V", 1],
 ["rya", "Рязань", 39.74, 54.63, "R", 1],
 ["kir", "Кирицы", 40.42, 54.47, "R"],
 ["eka", "Екатериновка", 41.05, 54.25, "R"],
 ["spk", "Спас-Клепики", 40.18, 55.13, "R"],
 ["tuma", "Тума", 40.55, 55.15, "R"],
 ["kas", "Касимов", 41.39, 54.94, "R"],
 ["shil", "Шилово", 40.88, 54.57, "R"],
 ["sas", "Сасово", 41.92, 54.35, "R", 1],
 ["rzh", "Ряжск", 40.0, 53.71, "R"],
 ["sko", "Скопин", 39.55, 53.82, "R"],
 ["mih", "Михайлов", 39.03, 54.23, "R"],
 ["nmi", "Новомичуринск", 39.75, 54.04, "R"],
 ["pav", "Павелец", 39.24, 53.81, "R"],
 ["sap", "Сапожок", 40.69, 53.94, "R"],
 ["sar", "Сараи", 40.99, 53.74, "R"],
 ["shat", "Шацк", 41.7, 54.03, "R"],
 ["chu", "Чучково", 41.45, 54.27, "R"],
 ["gly", "Глядково", 42.13, 54.43, "R"],
 ["pnz", "Пенза", 42.75, 53.75, "X"],
 ["nn", "Нижний Новгород", 42.85, 55.95, "X"],
 ["div", "Дивеево", 43.0, 55.0, "X"],
 ["pit", "Пителино", 41.84, 54.58, "R"],
 ["erm", "Ермишь", 42.27, 54.75, "R"],
 ["kad", "Кадом", 42.47, 54.56, "R"]
];
// ручные сдвиги (px), чтобы линии не пересекались и не задевали города
const NUDGE={"sp": [-6, 16], "klin": [-28, -14], "kub": [-34, 4]};
const ROUTE_DATA=[
 ["msk", "dom", ["white"], "main"],
 ["dom", "bron", ["red", "blue"], "main"],
 ["bron", "kol", ["yellow", "green"], "main"],
 ["kol", "luh", ["purple", "orange"], "main"],
 ["luh", "rya", ["green", "red"], "main"],
 ["rya", "kir", ["blue", "yellow"], "main"],
 ["kir", "eka", ["orange", "purple"], "main"],
 ["eka", "shat", ["black", "white"], "main"],
 ["shat", "sas", ["red", "green"], "main"],
 ["msk", "lyu", ["gray"], "alt"],
 ["lyu", "ram", ["gray"], "alt"],
 ["ram", "kur", ["gray"], "alt"],
 ["kur", "eg", ["gray"], "alt"],
 ["eg", "vos", ["gray"], "alt"],
 ["vos", "spk", ["gray"], "alt"],
 ["spk", "tuma", ["gray"], "alt"],
 ["tuma", "kas", ["gray"], "alt"],
 ["kas", "pit", ["gray"], "alt"],
 ["pit", "sas", ["gray"], "alt"],
 ["msk", "nog", ["blue", "white"], "exp"],
 ["nog", "oz", ["red", "yellow"], "exp"],
 ["oz", "vla", ["green", "black"], "exp"],
 ["vla", "mur", ["green"]],
 ["mur", "kas", ["black"]],
 ["kas", "pit", ["purple"]],
 ["pit", "sas", ["yellow"]],
 ["zven", "ist", ["orange"], "ckad"],
 ["ist", "sol", ["green"], "ckad"],
 ["sol", "kra", ["red"], "ckad"],
 ["kra", "nog", ["yellow"], "ckad"],
 ["nog", "ram", ["purple"], "ckad"],
 ["ram", "bron", ["orange"], "ckad"],
 ["dom", "pod", ["blue"], "ckad"],
 ["pod", "zven", ["black"], "ckad"],
 ["alx", "dmi", ["green"], "bmo"],
 ["dmi", "klin", ["blue"], "bmo"],
 ["klin", "kub", ["black"], "bmo"],
 ["kub", "nf", ["yellow"], "bmo"],
 ["nf", "che", ["red"], "bmo"],
 ["che", "mihn", ["purple"], "bmo"],
 ["mihn", "kol", ["orange"], "bmo"],
 ["kol", "vos", ["white"], "bmo"],
 ["vos", "kur", ["green"], "bmo"],
 ["kur", "oz", ["red"], "bmo"],
 ["oz", "alx", ["blue"], "bmo"],
 ["msk", "odi", ["blue"]],
 ["odi", "zven", ["gray"]],
 ["msk", "ist", ["white"]],
 ["msk", "sol", ["orange"]],
 ["msk", "push", ["yellow"]],
 ["push", "kra", ["gray"]],
 ["msk", "pod", ["red"]],
 ["zven", "kub", ["purple"]],
 ["ist", "klin", ["gray"]],
 ["sol", "dmi", ["black"]],
 ["kra", "sp", ["red"]],
 ["sp", "alx", ["gray"]],
 ["pod", "che", ["green"]],
 ["dom", "mihn", ["black"]],
 ["klin", "vol", ["gray"]],
 ["vol", "shah", ["gray"]],
 ["vol", "ruza", ["yellow"]],
 ["ruza", "kub", ["black"]],
 ["ruza", "moz", ["gray"]],
 ["kub", "moz", ["white"]],
 ["nf", "moz", ["gray"]],
 ["dmi", "dub", ["blue"]],
 ["klin", "dub", ["purple"]],
 ["che", "ser", ["blue"]],
 ["ser", "kash", ["gray"]],
 ["mihn", "kash", ["orange"]],
 ["kash", "ozy", ["yellow"]],
 ["ozy", "kol", ["green"]],
 ["kash", "sprud", ["purple"]],
 ["sprud", "mih", ["gray"]],
 ["ozy", "zar", ["gray"]],
 ["zar", "luh", ["blue"]],
 ["zar", "mih", ["red"]],
 ["kur", "sha", ["yellow"]],
 ["sha", "tuma", ["red"]],
 ["sha", "gus", ["green"]],
 ["gus", "vla", ["purple"]],
 ["gus", "tuma", ["blue"]],
 ["gus", "mur", ["gray"]],
 ["alx", "vla", ["gray"]],
 ["eg", "sha", ["orange"]],
 ["spk", "rya", ["black"]],
 ["kir", "shil", ["orange"]],
 ["rya", "nmi", ["green"]],
 ["nmi", "mih", ["gray"]],
 ["mih", "pav", ["blue"]],
 ["nmi", "rzh", ["red"]],
 ["sko", "rzh", ["yellow"]],
 ["pav", "sko", ["black"]],
 ["rzh", "sap", ["white"]],
 ["sap", "sar", ["gray"]],
 ["sar", "shat", ["purple"]],
 ["kir", "sap", ["gray"]],
 ["shil", "eka", ["gray"]],
 ["shil", "kas", ["yellow"]],
 ["kas", "erm", ["white"]],
 ["erm", "kad", ["gray"]],
 ["sas", "gly", ["orange"]],
 ["gly", "kad", ["gray"]],
 ["eka", "chu", ["blue"]],
 ["chu", "sas", ["green"]],
 ["shat", "pnz", ["white"]],
 ["mur", "nn", ["red"]],
 ["erm", "div", ["purple"]]
];
const TICKET_DATA={"long": [{"a": "msk", "b": "sas", "pts": 21}, {"a": "ser", "b": "mur", "pts": 20}, {"a": "dub", "b": "rya", "pts": 21}, {"a": "shah", "b": "vla", "pts": 20}, {"a": "alx", "b": "sar", "pts": 22}, {"a": "kash", "b": "nn", "pts": 22}], "regular": [{"a": "ist", "b": "sol", "pts": 2}, {"a": "luh", "b": "zar", "pts": 2}, {"a": "bron", "b": "lyu", "pts": 3}, {"a": "kas", "b": "pit", "pts": 3}, {"a": "kol", "b": "kur", "pts": 3}, {"a": "mih", "b": "pav", "pts": 3}, {"a": "mihn", "b": "pod", "pts": 3}, {"a": "moz", "b": "vol", "pts": 3}, {"a": "chu", "b": "shil", "pts": 3}, {"a": "eka", "b": "gly", "pts": 4}, {"a": "kad", "b": "div", "pts": 4}, {"a": "kir", "b": "sap", "pts": 4}, {"a": "kub", "b": "odi", "pts": 4}, {"a": "nmi", "b": "sko", "pts": 4}, {"a": "oz", "b": "sha", "pts": 4}, {"a": "che", "b": "nf", "pts": 4}, {"a": "shat", "b": "pnz", "pts": 4}, {"a": "bron", "b": "kra", "pts": 5}, {"a": "gus", "b": "spk", "pts": 5}, {"a": "dom", "b": "nog", "pts": 5}, {"a": "klin", "b": "zven", "pts": 5}, {"a": "ozy", "b": "sprud", "pts": 5}, {"a": "ram", "b": "vos", "pts": 5}, {"a": "dom", "b": "push", "pts": 6}, {"a": "ist", "b": "pod", "pts": 6}, {"a": "kas", "b": "spk", "pts": 6}, {"a": "kub", "b": "sol", "pts": 6}, {"a": "kur", "b": "mihn", "pts": 6}, {"a": "lyu", "b": "zven", "pts": 6}, {"a": "dmi", "b": "zven", "pts": 7}, {"a": "eg", "b": "kash", "pts": 7}, {"a": "eka", "b": "pnz", "pts": 7}, {"a": "erm", "b": "tuma", "pts": 7}, {"a": "kol", "b": "sprud", "pts": 7}, {"a": "sar", "b": "sko", "pts": 7}, {"a": "dmi", "b": "kra", "pts": 8}, {"a": "moz", "b": "msk", "pts": 8}, {"a": "mur", "b": "tuma", "pts": 8}, {"a": "ruza", "b": "ser", "pts": 8}, {"a": "rzh", "b": "shat", "pts": 8}, {"a": "che", "b": "push", "pts": 8}, {"a": "alx", "b": "klin", "pts": 9}, {"a": "bron", "b": "mih", "pts": 9}, {"a": "eg", "b": "ser", "pts": 9}, {"a": "kir", "b": "ozy", "pts": 9}, {"a": "lyu", "b": "ruza", "pts": 9}, {"a": "oz", "b": "sol", "pts": 9}, {"a": "dmi", "b": "nog", "pts": 10}, {"a": "eka", "b": "div", "pts": 10}, {"a": "kad", "b": "sap", "pts": 10}, {"a": "mihn", "b": "nmi", "pts": 10}, {"a": "oz", "b": "spk", "pts": 10}, {"a": "gus", "b": "ozy", "pts": 11}, {"a": "klin", "b": "sp", "pts": 11}, {"a": "pit", "b": "rya", "pts": 11}, {"a": "ram", "b": "ruza", "pts": 11}, {"a": "rzh", "b": "vos", "pts": 11}, {"a": "erm", "b": "nn", "pts": 12}, {"a": "kra", "b": "nf", "pts": 12}, {"a": "pav", "b": "shil", "pts": 12}, {"a": "sha", "b": "sprud", "pts": 12}, {"a": "gly", "b": "gus", "pts": 13}, {"a": "mur", "b": "vos", "pts": 13}, {"a": "sas", "b": "sha", "pts": 13}, {"a": "chu", "b": "sko", "pts": 13}, {"a": "alx", "b": "shah", "pts": 14}, {"a": "dub", "b": "vla", "pts": 14}, {"a": "kol", "b": "vol", "pts": 14}, {"a": "kad", "b": "luh", "pts": 15}, {"a": "mih", "b": "sas", "pts": 15}, {"a": "odi", "b": "tuma", "pts": 15}, {"a": "eg", "b": "gly", "pts": 16}, {"a": "erm", "b": "zar", "pts": 16}, {"a": "kir", "b": "sp", "pts": 16}]};

const cities={};
CITY_DATA.forEach(([id,n,lon,lat,reg,big])=>{const [x0,y0]=P(lon,lat),[dx,dy]=NUDGE[id]||[0,0];
  cities[id]={id,n,x:+(x0+dx).toFixed(1),y:+(y0+dy).toFixed(1),reg,big:!!big,exit:reg==="X"}});

const COLORS={red:["#d1453b","красный"],orange:["#e58a2b","оранжевый"],yellow:["#e9c440","жёлтый"],
 green:["#4a9a5b","зелёный"],blue:["#3a74c4","синий"],purple:["#8a5bb8","фиолетовый"],
 black:["#2e3138","чёрный"],white:["#f3f3ee","белый"],gray:["#a3a9b0","любой цвет"]};
const CARD_COLORS=["red","orange","yellow","green","blue","purple","black","white"];
const TYPES={std:{f:1,name:"обычный перегон"},main:{f:1,name:"основная магистраль"},alt:{f:0.8,name:"запасной путь"},
  exp:{f:1.3,name:"скоростная линия"},ckad:{f:1,name:"ЦКАД"},bmo:{f:1,name:"БМО"}};
const LINES={
  main:{name:"Основная магистраль",note:"Двухпутная и самая короткая.",nodes:["msk","dom","bron","kol","luh","rya","kir","eka","shat","sas"]},
  alt:{name:"Запасной путь",note:"Один путь, вагоны любого цвета. Свободнее, но вагонов больше.",nodes:["msk","lyu","ram","kur","eg","vos","spk","tuma","kas","pit","sas"]},
  north:{name:"Через Владимир",note:"До Владимира скоростная, дальше через Муром.",nodes:["msk","nog","oz","vla","mur","kas","pit","sas"],types:["exp","exp","exp","std","std","std","std"]},
};
const CKAD_RING=["zven","ist","sol","kra","nog","ram","bron","dom","pod"];
const BMO_RING=["alx","dmi","klin","kub","nf","che","mihn","kol","vos","kur","oz"];

// ---------- перегоны ----------
const keyOf=(a,b)=>a<b?a+"|"+b:b+"|"+a;
const tracks=[];
ROUTE_DATA.forEach(([a,b,cols,type="std"])=>cols.forEach(color=>tracks.push({id:tracks.length,a,b,color,type,key:keyOf(a,b)})));
const groups={}; tracks.forEach(t=>(groups[t.key]=groups[t.key]||[]).push(t));
Object.values(groups).forEach(g=>{g.sort((p,q)=>p.type<q.type?-1:p.type>q.type?1:0);
  g.forEach((t,i)=>{t.lane=i-(g.length-1)/2; if(t.a>t.b)t.lane=-t.lane})});
const dist=(a,b)=>Math.hypot(cities[b].x-cities[a].x,cities[b].y-cities[a].y);
tracks.forEach(t=>t.cars=Math.max(1,Math.min(6,Math.round(dist(t.a,t.b)/(UNIT*TYPES[t.type].f)))));

// ---------- правила ----------
const CARS_PER_PLAYER=45;
const ROUTE_POINTS=[0,1,2,4,6,9,12];
const EXPRESS_BONUS=2, RING_BONUS=6, LONGEST_BONUS=10;
const PLAYER_COLORS=["#0e9aa7","#d6336c","#f08c00","#5c4ccf"];
const START_REGULAR=4, START_MIN=2, DRAW_TICKETS=3, DRAW_MIN=1, HAND_START=4;
const LONG_TICKETS=TICKET_DATA.long.map(t=>({...t,long:true}));
const REGULAR_TICKETS=TICKET_DATA.regular.map(t=>({...t,long:false}));
const cardCost=t=>t.cars+(t.type==="exp"?1:0);
const trackPoints=t=>ROUTE_POINTS[t.cars]+(t.type==="exp"?EXPRESS_BONUS:0);
const tName=t=>`${cities[t.a].n} — ${cities[t.b].exit?"напр. "+cities[t.b].n:cities[t.b].n}`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

function shortest(s,t,costFn){
  const adj={};
  Object.entries(groups).forEach(([k,g])=>{const w=costFn?costFn(g):Math.min(...g.map(x=>x.cars));if(w===Infinity)return;
    const [a,b]=k.split("|");(adj[a]=adj[a]||[]).push([b,w,k]);(adj[b]=adj[b]||[]).push([a,w,k])});
  const d={},prev={},done=new Set(); Object.keys(cities).forEach(k=>d[k]=Infinity); d[s]=0;
  for(;;){let u=null;for(const k in d)if(!done.has(k)&&d[k]<Infinity&&(u===null||d[k]<d[u]))u=k;
    if(u===null||u===t)break;done.add(u);
    for(const [v,w,k] of adj[u]||[])if(d[u]+w<d[v]){d[v]=d[u]+w;prev[v]=[u,k]}}
  if(d[t]===Infinity)return null;
  const nodes=[t],keys=[];let cur=t;while(cur!==s){const [p,k]=prev[cur];keys.push(k);nodes.push(p);cur=p}
  return {cars:d[t],nodes:nodes.reverse(),keys:keys.reverse()};
}

// Работает и с полным состоянием, и с видом игрока: нужны owner, players[].cars
function trackBlockReason(S,pi,t){
  if(S.owner[t.id]!==undefined)return "Перегон уже занят.";
  const g=groups[t.key];
  if(g.some(x=>S.owner[x.id]===pi))return "Второй путь этого перегона нельзя занять тому же игроку.";
  if(S.players.length<=3&&g.length>1&&g.some(x=>S.owner[x.id]!==undefined))return "При 2–3 игроках двойной перегон закрывается после первой постройки.";
  if(S.players[pi].cars<t.cars)return "Не хватает вагонов.";
  return null;
}
function payOptions(hand,t){
  const need=cardCost(t),opts=[],cols=t.color==="gray"?CARD_COLORS:[t.color];
  cols.forEach(c=>{const h=hand[c];if(t.color==="gray"&&h===0)return;
    if(h+hand.loco>=need){const use=Math.min(h,need);opts.push({c,use,loco:need-use})}});
  if(hand.loco>=need&&!opts.some(o=>o.use===0))opts.push({c:t.color==="gray"?"loco":t.color,use:0,loco:need});
  return opts.sort((x,y)=>x.loco-y.loco);
}

// ---------- состояние ----------
function createGame(cfg){
  const deck=[];CARD_COLORS.forEach(c=>{for(let i=0;i<12;i++)deck.push(c)});for(let i=0;i<14;i++)deck.push("loco");
  const G={players:cfg.map((c,i)=>({name:String(c.name||"Игрок").slice(0,24),bot:!!c.bot,color:PLAYER_COLORS[i],cars:CARS_PER_PLAYER,score:0,
      hand:Object.fromEntries([...CARD_COLORS,"loco"].map(k=>[k,0])),tickets:[]})),
    deck:shuffle(deck),discard:[],market:[],shortDeck:shuffle(REGULAR_TICKETS.map(t=>({...t}))),longDeck:shuffle(LONG_TICKETS.map(t=>({...t}))),longOut:[],
    owner:{},turn:0,drawn:0,finalLeft:null,over:false,phase:"setup",pending:{},log:[],results:null};
  const ev=[];
  G.players.forEach(p=>{for(let i=0;i<HAND_START;i++)p.hand[drawDeck(G)]++});
  refillMarket(G);
  log(G,"Новая игра: "+G.players.map(p=>`<b>${esc(p.name)}</b>`).join(", ")+".");
  G.players.forEach((p,i)=>{G.pending[i]={offer:[G.longDeck.pop(),...G.shortDeck.splice(-START_REGULAR)].filter(Boolean),min:START_MIN,start:true}});
  G.players.forEach((p,i)=>{if(p.bot)keep(G,i,botChooseTickets(G.pending[i].offer,START_MIN),ev)});
  return {G,events:ev};
}
function log(G,html){G.log.unshift(html);if(G.log.length>80)G.log.pop()}
function drawDeck(G){
  if(!G.deck.length&&G.discard.length){G.deck=shuffle(G.discard);G.discard=[];log(G,"Сброс перемешан в колоду.")}
  return G.deck.pop()||null;
}
function refillMarket(G){
  for(let guard=0;guard<4;guard++){
    while(G.market.length<5){const c=drawDeck(G);if(!c)break;G.market.push(c)}
    if(G.market.filter(c=>c==="loco").length>=3&&(G.deck.length+G.discard.length)>=5){
      G.discard.push(...G.market);G.market=[];log(G,"На рынке три тепловоза: рынок обновлён.");
    } else break;
  }
}
function ownedAdj(G,pi){const adj={};tracks.forEach(t=>{if(G.owner[t.id]===pi){(adj[t.a]=adj[t.a]||[]).push(t);(adj[t.b]=adj[t.b]||[]).push(t)}});return adj}
function connected(G,pi,a,b){
  const adj=ownedAdj(G,pi),seen=new Set([a]),st=[a];
  while(st.length){const u=st.pop();if(u===b)return true;for(const t of adj[u]||[]){const v=t.a===u?t.b:t.a;if(!seen.has(v)){seen.add(v);st.push(v)}}}
  return false;
}
function longestTrail(G,pi){
  const adj=ownedAdj(G,pi);let best=0;const used=new Set();
  const dfs=(u,len)=>{best=Math.max(best,len);for(const t of adj[u]||[]){if(used.has(t.id))continue;used.add(t.id);dfs(t.a===u?t.b:t.a,len+t.cars);used.delete(t.id)}};
  Object.keys(adj).forEach(u=>dfs(u,0));return best;
}
function refreshTickets(G,pi,ev){
  const p=G.players[pi];p.tickets.forEach(t=>{const was=t.done;t.done=connected(G,pi,t.a,t.b);
    if(t.done&&!was)ev.push({type:"ticketDone",pi,name:tName(t),pts:t.pts,private:true})});
}
function keep(G,pi,idx,ev){
  const pend=G.pending[pi],p=G.players[pi];
  const kept=pend.offer.filter((_,i)=>idx.includes(i));
  kept.forEach(t=>p.tickets.push(t));
  // отказ от дальнего маршрута окончательный; обычные уходят под низ колоды
  pend.offer.filter((_,i)=>!idx.includes(i)).forEach(t=>t.long?G.longOut.push(t):G.shortDeck.unshift(t));
  delete G.pending[pi];
  refreshTickets(G,pi,ev);
  log(G,`<b>${esc(p.name)}</b> оставляет маршрутов: ${kept.length} из ${pend.offer.length}.`);
  ev.push({type:"tickets",pi,kept:kept.length,offered:pend.offer.length,start:pend.start});
  if(pend.start){if(!Object.keys(G.pending).length){G.phase="play";G.turn=0;G.drawn=0;ev.push({type:"turn",pi:0})}}
  else endTurn(G,ev);
}
function endTurn(G,ev){
  const p=G.players[G.turn];
  if(G.finalLeft===null&&p.cars<=2){G.finalLeft=G.players.length;log(G,`<b>${esc(p.name)}</b>: осталось ${p.cars} ваг. Каждый делает последний ход.`);ev.push({type:"final",pi:G.turn})}
  if(G.finalLeft!==null){G.finalLeft--;if(G.finalLeft<=0){finish(G,ev);return}}
  G.turn=(G.turn+1)%G.players.length;G.drawn=0;ev.push({type:"turn",pi:G.turn});
}
function finish(G,ev){
  G.over=true;
  const rows=G.players.map((p,i)=>{let tp=0,tm=0;p.tickets.forEach(t=>t.done?tp+=t.pts:tm+=t.pts);
    const ck=tracks.filter(t=>G.owner[t.id]===i&&t.type==="ckad").length,bm=tracks.filter(t=>G.owner[t.id]===i&&t.type==="bmo").length;
    return {pi:i,name:p.name,route:p.score,tp,tm,ck,bm,lt:longestTrail(G,i)}});
  const best=f=>{const m=Math.max(...rows.map(f));return m>0?m:Infinity};
  const mCk=best(r=>r.ck),mBm=best(r=>r.bm),mLt=best(r=>r.lt);
  rows.forEach(r=>{r.bCk=r.ck===mCk?RING_BONUS:0;r.bBm=r.bm===mBm?RING_BONUS:0;r.bLt=r.lt===mLt?LONGEST_BONUS:0;
    r.total=r.route+r.tp-r.tm+r.bCk+r.bBm+r.bLt});
  rows.sort((a,b)=>b.total-a.total);
  G.results=rows;
  log(G,`Игра окончена. Победитель: <b>${esc(rows[0].name)}</b>.`);
  ev.push({type:"over"});
}

// ---------- ходы ----------
// act(G, pi, action) → {ok:true, events} | {ok:false, error}
function act(G,pi,a){
  const ev=[],p=G.players[pi];
  if(!p)return {ok:false,error:"Нет такого игрока."};
  if(G.over)return {ok:false,error:"Игра окончена."};
  if(a.type==="keep"){
    const pend=G.pending[pi];if(!pend)return {ok:false,error:"Сейчас не нужно выбирать маршруты."};
    const idx=[...new Set((a.idx||[]).map(Number))].filter(i=>i>=0&&i<pend.offer.length);
    if(idx.length<pend.min)return {ok:false,error:`Оставьте хотя бы ${pend.min}.`};
    keep(G,pi,idx,ev);return {ok:true,events:ev};
  }
  if(G.phase!=="play")return {ok:false,error:"Игра ещё не началась."};
  if(G.turn!==pi)return {ok:false,error:"Сейчас не ваш ход."};
  if(G.pending[pi])return {ok:false,error:"Сначала выберите маршруты."};
  if(a.type==="market"){
    const i=Number(a.i),c=G.market[i];if(!c)return {ok:false,error:"Такой карты нет."};
    if(c==="loco"&&G.drawn>0)return {ok:false,error:"Тепловоз с рынка можно взять только первой картой."};
    p.hand[c]++;G.market.splice(i,1);refillMarket(G);
    log(G,`<b>${esc(p.name)}</b> берёт с рынка: ${c==="loco"?"тепловоз":COLORS[c][1]}.`);
    ev.push({type:"draw",pi,src:"market",i,card:c});
    if(c==="loco"){endTurn(G,ev);return {ok:true,events:ev}}
    afterDraw(G,ev);return {ok:true,events:ev};
  }
  if(a.type==="deck"){
    const c=drawDeck(G);if(!c)return {ok:false,error:"Колода пуста."};
    p.hand[c]++;log(G,`<b>${esc(p.name)}</b> берёт карту из колоды.`);
    ev.push({type:"draw",pi,src:"deck",card:c});afterDraw(G,ev);return {ok:true,events:ev};
  }
  if(a.type==="claim"){
    if(G.drawn>0)return {ok:false,error:"Вы уже взяли карту — возьмите вторую."};
    const t=tracks[Number(a.track)];if(!t)return {ok:false,error:"Нет такого перегона."};
    const r=trackBlockReason(G,pi,t);if(r)return {ok:false,error:r};
    const opts=payOptions(p.hand,t),opt=opts[Number(a.opt)||0];
    if(!opt)return {ok:false,error:`Нужно ${cardCost(t)} карт ${t.color==="gray"?"одного цвета":"цвета «"+COLORS[t.color][1]+"»"} (тепловозы подходят).`};
    claim(G,pi,t,opt,ev);return {ok:true,events:ev};
  }
  if(a.type==="tickets"){
    if(G.drawn>0)return {ok:false,error:"Вы уже взяли карту — возьмите вторую."};
    const offer=G.shortDeck.splice(-DRAW_TICKETS);if(!offer.length)return {ok:false,error:"Маршруты закончились."};
    G.pending[pi]={offer,min:DRAW_MIN,start:false};ev.push({type:"ticketsOffer",pi});return {ok:true,events:ev};
  }
  return {ok:false,error:"Неизвестное действие."};
}
function afterDraw(G,ev){
  G.drawn++;
  const nothingLeft=!G.deck.length&&!G.discard.length&&!G.market.some(c=>c!=="loco");
  if(G.drawn>=2||nothingLeft)endTurn(G,ev);
}
function claim(G,pi,t,opt,ev){
  const p=G.players[pi];
  if(opt.use){p.hand[opt.c]-=opt.use;for(let i=0;i<opt.use;i++)G.discard.push(opt.c)}
  if(opt.loco){p.hand.loco-=opt.loco;for(let i=0;i<opt.loco;i++)G.discard.push("loco")}
  G.owner[t.id]=pi;p.cars-=t.cars;const pts=trackPoints(t);p.score+=pts;
  log(G,`<b>${esc(p.name)}</b> строит ${esc(cities[t.a].n)} — ${esc(cities[t.b].n)} (${t.cars} ваг., +${pts}).`);
  ev.push({type:"claim",pi,track:t.id,pts});
  refreshTickets(G,pi,ev);
  endTurn(G,ev);
}

// ---------- бот: один шаг за вызов (карты берёт по одной) ----------
function botNeeds(G,pi){
  const p=G.players[pi],need=new Map();
  const cost=g=>{if(g.some(t=>G.owner[t.id]===pi))return 0;const free=g.filter(t=>!trackBlockReason(G,pi,t));
    return free.length?Math.min(...free.map(t=>t.cars)):Infinity};
  p.tickets.filter(t=>!t.done).forEach(tk=>{const path=shortest(tk.a,tk.b,cost);if(!path)return;
    path.keys.forEach(k=>{const g=groups[k];if(g.some(t=>G.owner[t.id]===pi))return;
      g.filter(t=>!trackBlockReason(G,pi,t)).forEach(t=>need.set(t.id,t))})});
  return [...need.values()];
}
function botChooseTickets(offer,min){
  const sc=offer.map((t,i)=>({i,t,c:shortest(t.a,t.b).cars})).sort((a,b)=>(a.c-a.t.pts*0.3)-(b.c-b.t.pts*0.3));
  return sc.filter((x,k)=>k<min||x.c<=8).slice(0,Math.max(min,3)).map(x=>x.i);
}
function botStep(G){
  if(G.over||G.phase!=="play")return null;
  const pi=G.turn,p=G.players[pi];if(!p.bot)return null;
  const run=a=>{const r=act(G,pi,a);return r.ok?r.events:null};
  const needs=botNeeds(G,pi).sort((a,b)=>b.cars-a.cars);
  if(G.drawn===0){
    for(const t of needs){const o=payOptions(p.hand,t);if(o.length)return run({type:"claim",track:t.id,opt:0})}
    if(!needs.length){
      if(G.shortDeck.length&&p.cars>12&&p.tickets.length<7){
        const e1=run({type:"tickets"});if(e1){const e2=run({type:"keep",idx:botChooseTickets(G.pending[pi].offer,DRAW_MIN)});return e1.concat(e2||[])}}
      const any=tracks.filter(t=>!trackBlockReason(G,pi,t)&&t.cars>=2).sort((a,b)=>b.cars-a.cars);
      for(const t of any){const o=payOptions(p.hand,t);if(o.length)return run({type:"claim",track:t.id,opt:0})}
    }
  }
  const want=new Set(needs.map(t=>t.color).filter(c=>c!=="gray"));
  const i=G.market.findIndex(c=>want.has(c));
  if(i>=0)return run({type:"market",i});
  if(G.drawn===0&&G.market.includes("loco")&&Math.random()<.35)return run({type:"market",i:G.market.indexOf("loco")});
  if(G.deck.length||G.discard.length)return run({type:"deck"});
  const k=G.market.findIndex(c=>c!=="loco");if(k>=0)return run({type:"market",i:k});
  if(G.drawn===0){
    const any=tracks.filter(t=>!trackBlockReason(G,pi,t)).sort((a,b)=>b.cars-a.cars);
    for(const t of any){const o=payOptions(p.hand,t);if(o.length)return run({type:"claim",track:t.id,opt:0})}
  }
  log(G,`<b>${esc(p.name)}</b> пропускает ход.`);const ev=[];endTurn(G,ev);return ev;
}

// ---------- что видит игрок pi (null — зритель) ----------
function view(G,pi){
  return {
    phase:G.phase,turn:G.turn,drawn:G.drawn,finalLeft:G.finalLeft,over:G.over,me:pi,
    players:G.players.map((p,i)=>({name:p.name,bot:p.bot,color:p.color,cars:p.cars,score:p.score,
      cards:Object.values(p.hand).reduce((a,b)=>a+b,0),ticketCount:p.tickets.length,
      hand:i===pi?{...p.hand}:null,tickets:(i===pi||G.over)?p.tickets.map(t=>({...t})):null,choosing:!!G.pending[i]})),
    market:G.market.slice(),deck:G.deck.length,discard:G.discard.length,ticketsLeft:G.shortDeck.length,
    owner:{...G.owner},log:G.log.slice(0,40),results:G.results,
    pending:pi!=null&&G.pending[pi]?{offer:G.pending[pi].offer.map(t=>({...t})),min:G.pending[pi].min,start:G.pending[pi].start}:null,
  };
}
// чужие карты из колоды скрыты, личные события видны только их хозяину
function eventsFor(ev,pi){
  return ev.filter(e=>!e.private||e.pi===pi).map(e=>e.type==="draw"&&e.src==="deck"&&e.pi!==pi?{...e,card:null}:e);
}

const api={P,cities,tracks,groups,COLORS,CARD_COLORS,TYPES,LINES,CKAD_RING,BMO_RING,keyOf,
  CARS_PER_PLAYER,ROUTE_POINTS,EXPRESS_BONUS,RING_BONUS,LONGEST_BONUS,PLAYER_COLORS,START_REGULAR,START_MIN,DRAW_TICKETS,DRAW_MIN,
  LONG_TICKETS,REGULAR_TICKETS,cardCost,trackPoints,tName,esc,shortest,trackBlockReason,payOptions,
  createGame,act,botStep,view,eventsFor};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.SasovoCore=api;
})(typeof window!=="undefined"?window:globalThis);
