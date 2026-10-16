/* NODE_PATH=../qa-deps/node_modules node --test tests/course-reading.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dist=path.resolve(__dirname,'../dist');
const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(dist,'course-reading.js'),'utf8'));
const format=w.ATLAS_COURSE_READING.format;
const parse=html=>{const el=d.createElement('div');el.innerHTML=html;return el;};
const lines=html=>[...parse(format(html)).querySelectorAll('.course-notion')].map(e=>e.textContent.trim());
function snapshot(node){
 const colors={};
 const walker=d.createTreeWalker(node,w.NodeFilter.SHOW_TEXT);let child;
 while((child=walker.nextNode())){
  const classes=new Set();
  for(let el=child.parentElement;el&&el!==node;el=el.parentElement)for(const c of el.classList)if(/^(nc-|kw-)/.test(c))classes.add(c);
  for(const c of classes)colors[c]=(colors[c]||'')+child.textContent;
 }
 return {text:node.textContent,colors,
  images:[...node.querySelectorAll('img')].map(e=>[e.getAttribute('src'),e.getAttribute('alt')]),
  links:[...node.querySelectorAll('a')].map(e=>[e.getAttribute('href'),e.textContent]),
  cells:[...node.querySelectorAll('td,th')].map(e=>[e.tagName,e.getAttribute('colspan'),e.getAttribute('rowspan'),e.textContent]),
  listSizes:[...node.querySelectorAll('ul,ol')].map(e=>e.children.length)};
}
test('Vaccination: three vaccine lines and a separate reminder, inside and outside tables',()=>{
 const content='Hexavalent DTCaP-Hib-HB à 2, 4 et <strong class="nc-blue">11 mois</strong> ; pneumocoque selon produit/calendrier ; ROR à 12 puis 16–18 mois. Les rappels ultérieurs DTCaP/dTcaP ne reprennent pas toutes les valences de l’hexavalent.';
 for(const html of ['<ul><li>'+content+'</li></ul>','<p>'+content+'</p>','<table><tr><td>'+content+'</td></tr></table>']){
  assert.deepEqual(lines(html),['Hexavalent DTCaP-Hib-HB à 2, 4 et 11 mois ;','pneumocoque selon produit/calendrier ;','ROR à 12 puis 16–18 mois.','Les rappels ultérieurs DTCaP/dTcaP ne reprennent pas toutes les valences de l’hexavalent.']);
  assert.deepEqual(snapshot(parse(format(html))),snapshot(parse(html)));
 }
});
test('Protect doses, conditions, brackets, abbreviations, links and inline images',()=>{
 const html='<p><img src="before.png">Dose de 0.5 mg/kg à 2, 4 et 11 mois ; ne pas administrer si allergie ; sauf avis spécialisé. Valeurs (intervalle [1 ; 2], cf. tableau) à interpréter avec le contexte. Le Dr. Martin précise les signes, symptômes et critères. <a href="https://example.org">Recommandation ; version complète.</a><img src="after.png"></p>';
 const result=lines(html);
 assert.ok(result.includes('Dose de 0.5 mg/kg à 2, 4 et 11 mois ;'));
 assert.ok(result.includes('ne pas administrer si allergie ; sauf avis spécialisé.'));
 assert.ok(result.includes('Valeurs (intervalle [1 ; 2], cf. tableau) à interpréter avec le contexte.'));
 assert.ok(result.includes('Le Dr. Martin précise les signes, symptômes et critères.'));
 assert.equal(lines('<p>Ne pas administrer ; excepté après avis spécialisé.</p>').length,0);
 assert.deepEqual(snapshot(parse(format(html))),snapshot(parse(html)));
});
test('Explicit bullets and labels work without semicolons; commas alone stay intact',()=>{
 assert.equal(lines('<p>Fièvre, toux, dyspnée et asthénie.</p>').length,0);
 assert.deepEqual(lines('<p>Signes cliniques : • fièvre • toux • dyspnée</p>'),['Signes cliniques :','• fièvre','• toux','• dyspnée']);
 const html='<table><tr><td><strong>Diagnostic :</strong> rechercher les signes évocateurs <strong>Traitement :</strong> adapter au contexte.</td></tr></table>';
 assert.equal(lines(html).length,2);
 assert.equal(parse(format(html)).querySelectorAll('.course-inline-heading').length,2);
 assert.deepEqual(snapshot(parse(format(html))),snapshot(parse(html)));
});
test('Existing line breaks and nested lists remain; formatting is idempotent',()=>{
 const html='<ul><li>Premier élément ; second élément.<br><span class="nc-purple">Autre notion.</span><ul><li>Valeur A ; valeur B.</li></ul></li></ul><table><tr><td>A ; B.<br>C ; D.</td></tr></table>';
 const first=format(html);
 assert.deepEqual(snapshot(parse(first)),snapshot(parse(html)));
 assert.equal(format(first),first);
 assert.equal(parse(first).querySelectorAll('br').length,2);
});
test('Bare card answers and boundaries inside a colored inline fragment preserve emphasis',()=>{
 const html='<strong><span class="nc-pink">Première notion ; deuxième notion ; troisième notion.</span></strong> Une autre phrase.';
 const result=format(html);
 assert.equal(lines(html).length,4);
 assert.deepEqual(snapshot(parse(result)),snapshot(parse(html)));
 assert.equal(parse(result).querySelectorAll('.course-notion strong .nc-pink').length,3);
 assert.equal(format(result),result);
});
test('All course and answer payloads preserve text, colors, links, images and table cells',()=>{
 for(const file of fs.readdirSync(path.join(dist,'data/items')))w.eval(fs.readFileSync(path.join(dist,'data/items',file),'utf8'));
 let objectives=0,cards=0,other=0,withLines=0,tableCells=0;
 for(const item of Object.values(w.ATLAS_ITEMS)){
  const original=JSON.stringify(item);
  const entries=[...item.objectifs.map(o=>[o.id,o.contenu,'objective']),...item.cards.map(c=>[c.i,c.a,'card']),...(item.astuces||[]).map((a,i)=>['tip-'+i,a.contenu,'other']),...Object.entries(item.strategie||{}).map(([key,value])=>[key,value,'other'])];
  for(const [id,html,type] of entries){
   if(!html)continue;
   const before=parse(html),after=parse(format(html));
   const a=snapshot(before),b=snapshot(after);
   // One pre-existing endocrine callout intentionally builds lists. The new
   // notion layout must still preserve every source character and image.
   if(before.textContent.includes('Bilan sanguin per-critique')){delete a.listSizes;delete b.listSizes;}
   assert.deepEqual(b,a,item.numero+' / '+id);
   if(type==='objective')objectives++;else if(type==='card')cards++;else other++;
   if(after.querySelector('.course-notions'))withLines++;
   tableCells+=after.querySelectorAll('td.course-notions,th.course-notions').length;
  }
  assert.equal(JSON.stringify(item),original);
 }
 console.log(JSON.stringify({items:Object.keys(w.ATLAS_ITEMS).length,objectives,cards,other,withLines,tableCells}));
});
