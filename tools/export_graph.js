// Выгружает перегоны (с числом вагонов, как их считает игра) в tools/graph.json.
// Запуск: python3 tools/build.py && node tools/export_graph.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  await p.goto('file://'+path.resolve(__dirname,'../public/index.html'));await p.waitForTimeout(500);
  const d=await p.evaluate(()=>({tracks:window.__oka.tracks.map(t=>[t.a,t.b,t.cars]),
    cities:Object.values(window.__oka.cities).map(c=>[c.id,c.n,c.exit])}));
  fs.writeFileSync(path.join(__dirname,'graph.json'),JSON.stringify(d));
  console.log('перегонов',d.tracks.length,'точек',d.cities.length);
  await b.close();
})();
