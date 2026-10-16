const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dist=path.resolve(__dirname,'../dist');
const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window,d=w.document;
for(const f of ['course-reading.js','course-semantics.js','course-customization.js'])w.eval(fs.readFileSync(path.join(dist,f),'utf8'));
const api=w.ATLAS_COURSE_SEMANTICS;
const parse=html=>{const el=d.createElement('div');el.innerHTML=html;return el;};
const notions=text=>Array.from(api.ranges(text),r=>[text.slice(r.start,r.end),r.kind]);
test('Semantic meaning replaces old hues, including words split over inline annotations',()=>{
 const result=parse(api.annotate('<p><span class="nc-blue_bg">Fièvre</span>, <b class="nc-red">NFS</b>, <span class="nc-green_bg">ECG</span>, <span class="nc-red_bg">rappels</span>, <span class="nc-pink">âge</span>, <span class="kw-clinique">les</span> ; dou<strong class="nc-bold nc-purple">leur</strong>.</p>'));
 assert.equal(result.textContent,'Fièvre, NFS, ECG, rappels, âge, les ; douleur.');
 assert.deepEqual([...result.querySelectorAll('[data-notion]')].map(e=>[e.textContent,e.dataset.notion]),[['Fièvre','clinical'],['NFS','biology'],['ECG','examination'],['dou','clinical'],['leur','clinical']]);
 assert.ok(result.querySelector('strong.nc-bold'));assert.equal(result.querySelector('[class*="kw-"]'),null);
});
test('Different notions in the same sentence receive distinct colors without coloring the sentence',()=>{
 assert.deepEqual(notions('Pneumonie : fièvre, CRP et radiographie thoracique ; amoxicilline 1 g, drainage, avis spécialisé. Urgence vitale.'),[
  ['Pneumonie','disease'],['fièvre','clinical'],['CRP','biology'],['radiographie thoracique','examination'],['amoxicilline','medicine'],['1 g','number'],['drainage','procedure'],['avis spécialisé','professional'],['Urgence vitale','important']]);
});
test('Context, case and complete expressions protect ambiguous abbreviations and indications',()=>{
 assert.deepEqual(notions('Les patients vs les témoins. LES ; VS ; RCP ; TCC ; EP ; PTH ; pneumocoque ; VIH ; confusion entre deux termes.'),[['LES','disease'],['VS','biology']]);
 assert.deepEqual(notions('Dosage de l’insuline ; concentration de lithium ; insuline rapide ; insuline sécrétée.'),[['Dosage de l’insuline','biology'],['concentration de lithium','biology'],['insuline rapide','medicine']]);
 assert.deepEqual(notions('Vaccin contre la rougeole ; diabète de type 2 ; anorexie mentale ; douleur abdominale.'),[['Vaccin contre la rougeole','medicine'],['diabète de type 2','disease'],['anorexie mentale','disease'],['douleur abdominale','clinical']]);
 assert.deepEqual(notions('Drainage veineux ; compression veineuse ; effet antalgique ; radiothérapie antalgique ; ponction pleurale évacuatrice.'),[['radiothérapie antalgique','procedure'],['ponction pleurale évacuatrice','procedure']]);
 assert.deepEqual(notions('Bilan : NFS, plaquettes, hémostase, PTH.'),[['NFS','biology'],['plaquettes','biology'],['hémostase','biology'],['PTH','biology']]);
 assert.deepEqual(notions('PTH pour la hanche ; insuline sécrétée ; plaquettes activées.'),[]);
});
test('Vaccination dates, products and written quantities, without false disease highlights',()=>{
 const text='DTCaP-Hib-HB à 2, 4 et 11 mois ; pneumocoque selon produit/calendrier ; ROR à 12 puis 16–18 mois. Deux doses ; tous les dix ans. Rappels selon âge.';
 assert.deepEqual(notions(text),[['DTCaP-Hib-HB','medicine'],['2','number'],['4','number'],['11 mois','number'],['ROR','medicine'],['12','number'],['16–18 mois','number'],['Deux doses','number'],['dix ans','number']]);
 assert.deepEqual(notions('Rattrapage 15–24 ans. Le 1er janvier 2023.'),[['15–24 ans','number'],['1er','number'],['2023','number']]);
 assert.deepEqual(notions('item 146, objectif 146-6, vitamine B12, HER2, 5 mg/kg/j, 150 G/L.'),[['5 mg/kg/j','number'],['150 G/L','number']]);
});
test('Negation, links, source citations, images, table structure and emphasis remain exact',()=>{
 const html='<table><tr><th>Diagnostic</th><td rowspan="2">Pas de <strong>fièvre</strong> ; sans <em>douleur</em>, ne pas administrer <span class="nc-pink_bg">amoxicilline</span> si allergie.<br><img src="https://example.test/image.jpg" alt="NFS 2026"></td></tr><tr><td><a href="https://example.test/146">Item 146</a></td></tr></table><details class="atlas-source-details"><summary>Sources</summary><p>NFS 2026</p></details>';
 const a=parse(html),b=parse(api.annotate(html));assert.equal(a.textContent,b.textContent);
 for(const selector of ['img','a','td','th','br','strong','em'])assert.equal(a.querySelectorAll(selector).length,b.querySelectorAll(selector).length);
 assert.equal(b.querySelector('img').outerHTML,a.querySelector('img').outerHTML);assert.equal(b.querySelector('a').outerHTML,a.querySelector('a').outerHTML);
 assert.equal(b.querySelector('td').rowSpan,2);assert.equal(b.querySelector('.atlas-source-details [data-notion]'),null);
 assert.equal(api.annotate(b.innerHTML),b.innerHTML);
});
test('The shared course renderer, popups and editor use the same semantic transformation',()=>{
 const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
 w.eval(app.slice(app.indexOf('function sanitize('),app.indexOf('function loadScript(')));
 const input='<p><span class="nc-red_bg">ECG</span> et NFS ; pas de fièvre.</p>';
 const categories=html=>[...parse(html).querySelectorAll('[data-notion]')].map(e=>[e.textContent,e.dataset.notion]);
 assert.deepEqual(categories(w.sanitize(input)),categories(w.ATLAS_CUSTOM_COURSE.renderHTML(input)));
 const manual=w.ATLAS_CUSTOM_COURSE.clean({objectives:{'146-6':{html:'<p><span class="nc-orange_bg">Mon repère</span></p>',semanticVersion:1}}}).objectives['146-6'];
 assert.equal(manual.semanticVersion,1);assert.ok(parse(w.ATLAS_CUSTOM_COURSE.renderHTML(manual.html,manual.semanticVersion)).querySelector('.nc-orange_bg'));
 assert.equal(parse(w.ATLAS_CUSTOM_COURSE.renderHTML('<p>Fièvre</p>',1)).querySelector('[data-notion]'),null,'Removing a personal color must stick after saving');
});
test('All source objectives, card answers, tips and strategies keep exact text and assets',()=>{
 const report={items:0,objectives:0,cards:0,tips:0,strategies:0,annotated:0,neutral:0,annotations:{},examples:{}};
 const snap=el=>({text:el.textContent,images:[...el.querySelectorAll('img')].map(e=>[e.getAttribute('src'),e.alt]),links:[...el.querySelectorAll('a')].map(e=>[e.getAttribute('href'),e.textContent]),cells:[...el.querySelectorAll('td,th')].map(e=>[e.tagName,e.getAttribute('colspan'),e.getAttribute('rowspan'),e.textContent]),lists:[...el.querySelectorAll('ul,ol')].map(e=>e.children.length),emphasis:[...el.querySelectorAll('strong,b,em,i,u,.nc-bold')].map(e=>[e.tagName,e.textContent])});
 for(const file of fs.readdirSync(path.join(dist,'data/items')))w.eval(fs.readFileSync(path.join(dist,'data/items',file),'utf8'));
 for(const item of Object.values(w.ATLAS_ITEMS)){
  report.items++;const original=JSON.stringify(item);
  const entries=[...item.objectifs.map(o=>['objectives',o.id,o.contenu]),...(item.cards||[]).map(c=>['cards',c.i,c.a]),...(item.astuces||[]).map((a,i)=>['tips',`${item.numero}-tip${i}`,a.contenu]),...Object.entries(item.strategie||{}).filter(([,s])=>s).map(([k,s])=>['strategies',`${item.numero}-${k}`,s])];
  for(const [kind,id,html] of entries){
   report[kind]++;const source=parse(html||''),result=parse(api.annotate(html));
   assert.deepEqual(snap(result),snap(source),String(id));
   const spans=[...result.querySelectorAll('[data-notion]')];report[spans.length?'annotated':'neutral']++;
   for(const span of spans){const k=span.dataset.notion;report.annotations[k]=(report.annotations[k]||0)+1;(report.examples[k]||=[]);if(report.examples[k].length<12&&!report.examples[k].some(e=>e.text===span.textContent))report.examples[k].push({id,text:span.textContent});}
   assert.equal(result.querySelector('[class*="kw-"]'),null,String(id));
  }
  assert.equal(JSON.stringify(item),original);
 }
 if(process.env.SEMANTIC_AUDIT)fs.writeFileSync(process.env.SEMANTIC_AUDIT,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
});
