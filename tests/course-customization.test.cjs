const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dist=path.resolve(__dirname,'../dist');
function setup(){
 const dom=new JSDOM('<main></main>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.Range.prototype.getClientRects=()=>[];
 w.Range.prototype.getBoundingClientRect=()=>({top:0,left:0,bottom:0,right:0,width:0,height:0});
 w.eval(fs.readFileSync(path.join(dist,'course-reading.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(dist,'course-semantics.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(dist,'course-customization.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(dist,'vendor/course-editor.js'),'utf8'));
 return {dom,w,d:w.document,api:w.ATLAS_CUSTOM_COURSE};
}
test('Sanitization rejects active content, unsafe links and pasted CSS but preserves annotations and source tables',()=>{
 const {api,d,dom}=setup();
 const html=api.cleanHTML('<script>alert(1)</script><iframe src="https://evil.test"></iframe><p onclick="bad()" style="position:fixed;color:rgb(224, 62, 62)"><span class="nc-red_bg arbitrary">Notion</span><a href="javascript:bad()">texte</a><img src="https://example.test/a.jpg" onerror="bad()" alt="Image"></p><table><tr><td rowspan="2">A</td><td>B</td></tr></table>');
 d.body.innerHTML=html;
 assert.equal(d.querySelector('script,iframe,[onclick],[onerror],[style]'),null);
 assert.equal(d.querySelector('a').getAttribute('href'),null);
 assert.ok(d.querySelector('p.nc-red'));
 assert.equal(d.querySelector('span').className,'nc-red_bg');
 assert.equal(d.querySelector('td').rowSpan,2);
 assert.equal(d.querySelector('img').src,'https://example.test/a.jpg');dom.window.close();
});
test('Profile cleaning retains saved versions, drafts, prior versions and reversible deleted sections',()=>{
 const {api,dom}=setup();
 const entry={html:'<p><span class="nc-pink">12 mois</span></p>',updatedAt:'2026-10-16',item:146,group:'Prise en charge'};
 const data={objectives:{'146-6':entry,'bad':entry},drafts:{'personal-12345678':entry},previous:{'146-6':null},sections:{146:[{...entry,id:'personal-12345678',title:'Ma section',deleted:true,learned:true}]}};
 const cleaned=api.clean(data);
 assert.equal(cleaned.objectives['146-6'].html,entry.html);assert.equal(cleaned.objectives.bad,undefined);
 assert.equal(cleaned.drafts['personal-12345678'].item,146);assert.equal(cleaned.previous['146-6'],null);
 assert.equal(cleaned.sections[146][0].deleted,true);assert.equal(cleaned.sections[146][0].learned,true);
 assert.equal(JSON.stringify(api.clean(JSON.parse(JSON.stringify(cleaned)))),JSON.stringify(cleaned));
 dom.window.close();
});
test('The real account cleaner and backup import retain personalized course fields',()=>{
 const {w,api,dom}=setup();const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function cleanAccountState('),app.indexOf('const syncLabels='));
 w.eval(`const defaults=()=>({version:1,name:'Invité'});const catalog=[{numero:146}];const cardIndex=[];const readingScale=x=>x||1;const cleanObjectiveFavoriteIds=x=>x||[];${body};window.testClean=cleanAccountState;`);
 const courses=api.clean({objectives:{'146-6':{html:'<p>Mon texte</p>'}}});
 assert.equal(w.testClean({version:1,courseEdits:courses}).courseEdits.objectives['146-6'].html,'<p>Mon texte</p>');
 const importSource=app.slice(app.indexOf('async function importState('),app.indexOf('function searchModal('));
 assert.match(importSource,/clean.courseEdits=window.ATLAS_CUSTOM_COURSE.clean\(d.courseEdits\)/);
 dom.window.close();
});
test('Rich editor supports semantic formatting, undo, tables, checklists and collapsible blocks',()=>{
 const {api,w,d,dom}=setup();const root=d.createElement('div');d.body.append(root);
 const e=w.ATLAS_RICH_EDITOR.create(root,'<p>Douleur</p>',()=>{},()=>{});
 e.commands.selectAll();e.commands.setMark('courseStyle',{class:'nc-red'});e.commands.toggleBold();
 assert.match(e.getHTML(),/nc-red/);assert.match(e.getHTML(),/<strong>/);
 e.commands.undo();assert.doesNotMatch(e.getHTML(),/<strong>/);e.commands.redo();assert.match(e.getHTML(),/<strong>/);
 e.commands.setContent('<p>À vérifier</p>');e.commands.toggleTaskList();assert.match(e.getHTML(),/data-type="taskList"/);
 e.commands.setContent('<details><summary>Repères</summary><p>Contenu</p></details>');assert.match(e.getHTML(),/<summary>Repères<\/summary>/);
 e.commands.setContent('<p></p>');e.commands.insertTable({rows:2,cols:2,withHeaderRow:true});assert.equal(root.querySelectorAll('td,th').length,4);
 assert.equal(api.cleanHTML(e.getHTML()).includes('<table'),true);e.destroy();dom.window.close();
});
test('Every source objective survives editor parsing without losing text, links, images or table cells',()=>{
 const {w,d,dom,api}=setup();
 for(const f of fs.readdirSync(path.join(dist,'data/items')))w.eval(fs.readFileSync(path.join(dist,'data/items',f),'utf8'));
 const root=d.createElement('div');d.body.append(root);
 const e=w.ATLAS_RICH_EDITOR.create(root,'<p></p>',()=>{},()=>{});
 const parse=html=>{const div=d.createElement('div');div.innerHTML=html;return div;};
 // The editor repairs ragged source rows by adding empty cells. Compare all
 // populated cells in order, while requiring exact text, links and image assets.
 const signature=html=>{const div=parse(html);return {text:div.textContent.replace(/\s/g,''),images:[...div.querySelectorAll('img')].map(i=>[i.getAttribute('src'),i.alt]),links:[...div.querySelectorAll('a[href]')].map(a=>[a.getAttribute('href'),a.textContent.replace(/\s/g,'')]),cells:[...div.querySelectorAll('td,th')].map(c=>c.textContent.replace(/\s/g,'')).filter(Boolean)};};
 let count=0;
 for(const item of Object.values(w.ATLAS_ITEMS))for(const o of item.objectifs){
   const original=JSON.stringify(o);const cleaned=api.cleanHTML(o.contenu);
   e.commands.setContent(cleaned,{emitUpdate:false});
   assert.deepEqual(signature(e.getHTML()),signature(cleaned),o.id);
   assert.equal(JSON.stringify(o),original);count++;
 }
 console.log(JSON.stringify({sourceObjectives:count}));e.destroy();dom.window.close();
});
test('Block movement and duplication are reversible and retain inline annotations',()=>{
 const {w,d,dom}=setup();const root=d.createElement('div');d.body.append(root);
 const e=w.ATLAS_RICH_EDITOR.create(root,'<p>Premier</p><p><span class="nc-blue">Second</span></p>',()=>{},()=>{});
 e.commands.setTextSelection(11);w.ATLAS_RICH_EDITOR.block(e,'move-up');
 assert.equal(root.querySelector('p').textContent,'Second');assert.ok(root.querySelector('p .nc-blue'));
 e.commands.undo();assert.equal(root.querySelector('p').textContent,'Premier');
 e.commands.setTextSelection(1);w.ATLAS_RICH_EDITOR.block(e,'duplicate');assert.equal(root.querySelectorAll('p').length,3);
 e.commands.undo();assert.equal(root.querySelectorAll('p').length,2);
 e.destroy();dom.window.close();
});
test('Changing text color across differently highlighted terms keeps each background intact',()=>{
 const {w,d,dom}=setup();const root=d.createElement('div');d.body.append(root);
 const e=w.ATLAS_RICH_EDITOR.create(root,'<p><span class="nc-red_bg">Maladie</span> <span class="nc-blue_bg">Examen</span></p>',()=>{},()=>{});
 e.commands.selectAll();e.commands.setMark('courseColor',{class:'nc-pink'});
 assert.equal(root.querySelector('.nc-red_bg').textContent,'Maladie');assert.equal(root.querySelector('.nc-blue_bg').textContent,'Examen');
 e.commands.unsetMark('courseColor');assert.equal(root.querySelector('.nc-pink'),null);assert.ok(root.querySelector('.nc-red_bg'));
 e.destroy();dom.window.close();
});
test('A storage failure keeps the editor open; retry saves without touching the source',async()=>{
 const {w,d,api,dom}=setup();
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const original={id:'146-6',titre:'Calendrier',rubrique:'Prise en charge',contenu:'<p>Source conservée</p>'};
 const item={numero:146,objectifs:[original]},state={courseEdits:api.clean(null)};
 d.querySelector('main').innerHTML='<section id="rubrique-0"><details open class="objective" data-objective-id="146-6"><summary><span class="reader-objective-title">Calendrier</span></summary><div class="reader-course-content"></div></details></section>';
 let saved=false,instance;const make=w.ATLAS_RICH_EDITOR.create;
 w.ATLAS_RICH_EDITOR.create=(...args)=>instance=make(...args);
 api.mount({item,state,save:()=>saved,render:()=>{},toast:()=>{}});
 d.querySelector('[data-ce="edit"]').click();await new Promise(r=>setTimeout(r,20));
 instance.commands.setContent('<p>Ma version</p>');d.querySelector('[data-editor="save"]').click();
 assert.ok(d.querySelector('dialog'));assert.match(d.querySelector('.ce-error').textContent,/impossible/);
 assert.equal(state.courseEdits.objectives['146-6'],undefined);assert.equal(original.contenu,'<p>Source conservée</p>');
 saved=true;d.querySelector('[data-editor="save"]').click();
 assert.equal(d.querySelector('dialog'),null);assert.equal(state.courseEdits.objectives['146-6'].html,'<p>Ma version</p>');
 assert.equal(original.contenu,'<p>Source conservée</p>');dom.window.close();
});
