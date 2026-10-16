/* Run with NODE_PATH pointing to a jsdom installation. No network/browser required. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dist=path.resolve(__dirname,'../dist');
const html=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const sanitizeSource=html.slice(html.indexOf('function sanitize('),html.indexOf('function loadScript('));
const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
w.requestAnimationFrame=()=>0;w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
for(const file of ['course-reading.js','data/illustrations.js','illustrations.js','objective-reading.js'])w.eval(fs.readFileSync(path.join(dist,file),'utf8'));
w.eval(sanitizeSource+'\nwindow.ATLAS_COURSE={sanitize};');
const sanitizer=w.ATLAS_COURSE.sanitize;
for(const file of fs.readdirSync(path.join(dist,'data/items')))w.eval(fs.readFileSync(path.join(dist,'data/items',file),'utf8'));
const items=Object.values(w.ATLAS_ITEMS);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function snapshot(medical){
 const copy=medical.cloneNode(true);copy.querySelectorAll('.reader-section-label').forEach(e=>e.remove());
 return {text:copy.textContent,colors:[...copy.querySelectorAll('[class]')].map(e=>[...e.classList].filter(c=>/^(nc-|kw-)/.test(c))).filter(x=>x.length),links:[...copy.querySelectorAll('a')].map(e=>[e.getAttribute('href'),e.textContent]),images:[...copy.querySelectorAll('img')].map(e=>[e.getAttribute('src'),e.alt]),tables:[...copy.querySelectorAll('table')].map(e=>e.textContent)};
}
function render(item){
 w.ATLAS_OBJECTIVE_READING.capture();w.history.replaceState(null,'','#item/'+item.numero);
 const groups=[...new Set(item.objectifs.map(o=>o.rubrique))];
 d.querySelector('#app').innerHTML='<header class="topbar"></header><main><div class="reading-header"><h1>'+esc(item.titre)+'</h1></div><div class="reading-layout"><div>'+groups.map(g=>'<section class="reading-section"><h2>'+esc(g)+'</h2>'+item.objectifs.filter(o=>o.rubrique===g).map(o=>'<details class="objective" data-objective-id="'+o.id+'"><summary><span>'+esc(o.titre)+'</span>'+w.ATLAS_ILLUSTRATIONS.objectiveBadge(o.id)+'<button data-action="objective-favorite" data-obj="'+o.id+'">Favori</button></summary><div class="objective-body"><div class="medical">'+sanitizer(o.contenu,!!w.ATLAS_ILLUSTRATIONS.countObjective(o.id))+'</div>'+w.ATLAS_ILLUSTRATIONS.objectiveImages(o)+'<div class="objective-tools"><button data-action="master" data-obj="'+o.id+'">Acquis</button></div></div></details>').join('')+'</section>').join('')+'</div><aside class="reading-aside"><p class="source-note">Provenance inchangée</p></aside></div></main>';
 const before=[...d.querySelectorAll('.objective')].map(el=>({id:el.dataset.objectiveId,medical:el.querySelector('.medical'),snapshot:snapshot(el.querySelector('.medical')),images:el.querySelector('.objective-illustrations'),favorite:el.querySelector('[data-action="objective-favorite"]'),tools:el.querySelector('.objective-tools')}));
 w.ATLAS_OBJECTIVE_READING.enhance(item);
 return before;
}
let objectives=0,cards=0,imageObjectives=0;
test('All 367 items retain their source content, illustration controls, official titles and card IDs',()=>{
 for(const item of items){
  const payload=JSON.stringify(item),before=render(item);
  assert.equal(d.querySelectorAll('.objective').length,item.objectifs.length);
  assert.equal(d.querySelectorAll('.reader-toc [data-reading-target]').length,item.objectifs.length);
  for(const entry of before){
   const el=d.querySelector('[data-objective-id="'+entry.id+'"]');
   assert.equal(el.querySelector('.reader-original-course'),entry.medical,entry.id+' course node');
   assert.deepEqual(snapshot(entry.medical),entry.snapshot,entry.id+' source');
   assert.equal(el.querySelector('.reader-official p').textContent,item.objectifs.find(o=>o.id===entry.id).titre);
   assert.equal(el.querySelector('[data-action="objective-favorite"]'),entry.favorite);
   assert.equal(el.querySelector('.objective-tools'),entry.tools);
   if(entry.images){assert.equal(el.querySelector('.objective-illustrations'),entry.images);imageObjectives++;}
   const sourceCards=item.cards.filter(c=>c.o===entry.id);
   if(sourceCards.length){
    el.querySelector('[data-reading="test"]').click();
    assert.equal(el.querySelector('.reader-course-content').hidden,true);
    sourceCards.forEach((card,i)=>{
     if(i)el.querySelector('[data-reading="next-card"]').click();
     assert.equal(el.querySelector('.reader-card').dataset.cardId,card.i);
     assert.equal(el.querySelector('.reader-question').textContent,card.q);
     const expected=d.createElement('div');expected.innerHTML=sanitizer(card.a);
     assert.deepEqual(snapshot(el.querySelector('.reader-answer .medical')),snapshot(expected),card.i+' correction');
     assert.equal(el.querySelector('.reader-answer').open,false);
     cards++;
    });
    el.querySelector('[data-reading="return"]').click();
    assert.equal(el.querySelector('.reader-course-content').hidden,false);
   } else assert.equal(el.querySelector('[data-reading="test"]'),null);
   objectives++;
  }
  d.querySelector('[data-reading="open-all"]').click();assert.equal(d.querySelectorAll('.objective[open]').length,item.objectifs.length);
  d.querySelector('[data-reading="close-all"]').click();assert.equal(d.querySelectorAll('.objective[open]').length,0);
  assert.equal(JSON.stringify(item),payload,'item data mutated: '+item.numero);
 }
 console.log(JSON.stringify({items:items.length,objectives,cards,imageObjectives}));
});
test('Open objectives survive render, item changes and navigation without closing siblings',()=>{
 const a=items.find(i=>i.numero===146),b=items.find(i=>i.numero===356);
 render(a);d.querySelector('[data-reading="close-all"]').click();
 d.querySelector('[data-reading-target="146-6"]').click();d.querySelector('[data-reading-target="146-2"]').click();
 assert.equal(d.querySelectorAll('.objective[open]').length,2);
 render(b);assert.equal(d.querySelectorAll('.reader-toc [data-reading-target]').length,b.objectifs.length);
 render(a);assert.equal(d.querySelectorAll('.objective[open]').length,2);
 assert.equal(d.querySelector('[data-objective-id="146-6"]').open,true);
 assert.equal(d.querySelector('[data-objective-id="146-2"]').open,true);
});
test('Verification metadata stays item-specific, including pending and unreviewed content',()=>{
 const original=items.find(i=>i.numero===1),copy=JSON.parse(JSON.stringify(original));
 delete copy.courseEdition;render(copy);assert.doesNotMatch(d.querySelector('.reader-references').textContent,/Relu le/);
 copy.courseEdition={verification:'pending',reviewedAt:'2026-10-16'};render(copy);
 assert.match(d.querySelector('.reader-references').textContent,/Vérification en cours/);assert.doesNotMatch(d.querySelector('.reader-references').textContent,/Relu le/);
});
test('A detached previous answer cannot reveal the next card after re-rendering',()=>{
 const item=items.find(i=>i.numero===356);render(item);
 const objective=d.querySelector('[data-objective-id="356-1"]');
 objective.querySelector('[data-reading="test"]').click();
 const previous=objective.querySelector('.reader-answer');previous.open=true;
 objective.querySelector('[data-reading="next-card"]').click();
 previous.dispatchEvent(new w.Event('toggle'));
 render(item);
 assert.equal(d.querySelector('[data-objective-id="356-1"] .reader-answer').open,false);
});
