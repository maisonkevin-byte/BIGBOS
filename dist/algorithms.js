(() => {
'use strict';
const data=window.ATLAS_ALGORITHM_DATA;
if(!data)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessions=new Map();
let coursePlacement='popup';
const forItem=n=>data.algorithms.filter(a=>a.items.includes(Number(n)));
const itemLabel=n=>(window.ATLAS_CATALOG||[]).find(x=>x.numero===n)?.titre||'Item '+n;
const button=(label,action,attrs='',cls='')=>'<button type="button" class="algo-button '+cls+'" data-algo-action="'+action+'" '+attrs+'>'+esc(label)+'</button>';
const initialMode=algorithm=>algorithm?.sourceOnly?'source':algorithm?.defaultMode||(algorithm?.collegeSource?'source':'overview');
function session(item){
 if(!sessions.has(item))sessions.set(item,{selected:forItem(item)[0]?.id,mode:initialMode(forItem(item)[0]),paths:{},missing:false});
 return sessions.get(item);
}
function references(node){
 return '<div class="algo-sources" aria-label="Sources de cette étape">'+node.refs.map(k=>{const s=data.sources[k];return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(s.title)+'">'+esc(s.code)+(s.rank?' · Rang '+esc(s.rank):'')+' ↗</a>';}).join('')+'</div>';
}
function related(node){
 return node.related?.length?'<div class="algo-related"><strong>Poursuivre dans les fiches</strong>'+node.related.map(n=>'<a href="#item/'+n+'">Item '+n+' · '+esc(itemLabel(n))+' →</a>').join('')+'</div>':'';
}
function information(node,sourceOnly=false){
 const body='<ul class="algo-detail-points">'+node.body.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>';
 const actions=node.actions?.length?'<div class="algo-body"><h4>À faire</h4><ul class="algo-detail-actions">'+node.actions.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div><details class="algo-why"><summary>Précisions de cette étape</summary>'+body+'</details>':'<div class="algo-body">'+body+'</div>';
 return actions+'<details class="algo-why"><summary>'+(sourceOnly?'Pourquoi ce lien de cours ?':'Pourquoi cette étape ?')+'</summary><p>'+esc(node.why)+'</p></details>'+related(node)+references(node);
}
function courseSlot(node){
 return node.course?.length?'<section class="algo-course" aria-label="Cours associé"><h4>Ton cours associé</h4><div class="algo-course-content" aria-live="polite" data-course-node="'+esc(node.id)+'"><p>Chargement du cours…</p></div></section>':'';
}
async function hydrateCourse(scope,algorithm){
 for(const host of scope.querySelectorAll('.algo-course-content:not([data-loading])')){
  host.dataset.loading='true';
  const node=algorithm.nodes.find(n=>n.id===host.dataset.courseNode);
  if(!node?.course?.length)continue;
  const results=await Promise.allSettled(node.course.map(async id=>{
   const item=Number(id.split('-')[0]);
   const source=await window.ATLAS_COURSE.loadItem(item);
   const objective=source?.objectifs.find(o=>o.id===id);
   if(!objective)throw Error('Objectif indisponible');
   return {item,objective};
  }));
  if(!host.isConnected)continue;
  host.innerHTML=results.map((result,i)=>{
   const id=node.course[i],item=Number(id.split('-')[0]);
   if(result.status!=='fulfilled')return '<p>Le cours '+esc(id)+' n’a pas pu être chargé. <a href="#item/'+item+'/'+esc(id)+'">Ouvrir la fiche →</a> '+button('Réessayer','retry-course')+'</p>';
   const {objective:o}=result.value;
   return '<details class="algo-course-objective"><summary><span class="algo-course-id">'+esc(o.id)+' · Rang '+esc(o.rang)+'</span><strong>'+esc(o.titre)+'</strong><span class="algo-course-toggle">Lire le cours <span aria-hidden="true">+</span></span></summary><div class="medical">'+window.ATLAS_COURSE.sanitize(o.contenu,!!window.ATLAS_ILLUSTRATIONS?.countObjective(o.id))+'</div>'+(window.ATLAS_ILLUSTRATIONS?.objectiveImages(o)||'')+'<a class="algo-course-link" href="#item/'+item+'/'+esc(o.id)+'">Retrouver cet objectif dans la fiche →</a></details>';
  }).join('');
  window.ATLAS_ILLUSTRATIONS?.hydrate(host);
 }
}
function showDetail(root,algorithm,node,placement=coursePlacement){
 const state=session(Number(root.dataset.algoItem));state.inspected=node.id;
 const dialog=root.querySelector('.algo-detail'),below=root.querySelector('.algo-below');
 const isBelow=placement==='below';coursePlacement=placement;
 if(isBelow){dialog.close();window.ATLAS_ALGORITHM_TREE.closeExpanded();}
 if(below){below.hidden=!isBelow;if(!isBelow)below.innerHTML='';}
 const host=isBelow?below:dialog;if(!host)return;
 host.innerHTML='<div class="algo-detail-top">'+(kindLabel(node)||'<span class="algo-eyebrow">'+(algorithm.sourceOnly?'Cours associé à la source':'Marche à suivre')+'</span>')+'<div class="algo-detail-tools">'+button(isBelow?'Ouvrir en pop-up':'Afficher sous l’arbre','placement','data-placement="'+(isBelow?'popup':'below')+'"')+button('Fermer ×','close-detail')+'</div></div><h3 id="'+(isBelow?'algo-below-title':'algo-detail-title')+'" tabindex="-1">'+esc(node.title)+'</h3>'+information(node,algorithm.sourceOnly)+courseSlot(node)+(node.choices.length?'<div class="algo-detail-branches"><strong>Poursuivre dans l’arbre</strong>'+node.choices.map(c=>button(c.label+' →','inspect','data-node="'+esc(c.to)+'"')).join('')+'</div>':'');
 root.querySelectorAll('.algo-tree-card').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.node===node.id)));
 if(isBelow){const heading=host.querySelector('h3');heading.focus({preventScroll:true});host.scrollIntoView({block:'start',behavior:'smooth'});}
 else if(!dialog.open)dialog.showModal();else{dialog.scrollTop=0;dialog.querySelector('h3').focus({preventScroll:true});}
 hydrateCourse(host,algorithm);
}

function collegeSourceView(algorithm){
 const s=algorithm.collegeSource;if(!s)return '';
 const image=s.image?'<a class="algo-original-link" href="'+esc(s.image)+'" target="_blank" rel="noopener noreferrer"><img class="algo-original-image" src="'+esc(s.image)+'" alt="'+esc(s.imageAlt)+'"><span>Ouvrir la figure originale en plein format ↗</span></a>':'';
 const t=s.table;
 const table=t?'<div class="algo-source-table"><table><caption>'+esc(t.caption)+'</caption><thead><tr>'+t.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(row=>'<tr>'+row.map((cell,i)=>'<'+(i===0?'th scope="row"':'td')+'>'+esc(cell)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')+'</tbody></table></div>':'';
 const document=s.documentUrl?'<p class="algo-source-credit"><a class="algo-button" href="'+esc(s.documentUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(s.documentLabel||'Ouvrir le document original ↗')+'</a></p>':'';
 const steps='<div class="algo-source-courses"><h3>'+(algorithm.sourceOnly?'Cours en lien avec cette ressource':'Ouvrir une étape et son cours')+'</h3><div>'+algorithm.nodes.filter(n=>n.course?.length).map(n=>button(n.title,'inspect','data-node="'+esc(n.id)+'"')).join('')+'</div></div>';
 return '<section class="algo-college-source" aria-label="Source du collège"><p class="algo-source-credit"><strong>'+esc(s.college)+'</strong> · '+esc(s.edition)+' · Item '+esc(s.item)+' · '+esc(s.reference)+'</p>'+image+table+document+steps+'</section>';
}
function sourceNotes(algorithm){const notes=algorithm.collegeSource?.notes;return notes?.length?'<details class="algo-source-notes" open><summary>Précisions sur la source et la transposition</summary>'+notes.map(t=>'<p>'+esc(t)+'</p>').join('')+'</details>':'';}

function renderStage(item){
 const state=session(item),algorithm=forItem(item).find(a=>a.id===state.selected);
 if(!algorithm)return '';
 const path=state.paths[algorithm.id]||(state.paths[algorithm.id]=['entry']);
 const nodes=new Map(algorithm.nodes.map(n=>[n.id,n]));
 const current=nodes.get(path[path.length-1])||algorithm.nodes[0];
 const sourceLabel=algorithm.collegeSource?.kind==='table'?'Tableau du collège':algorithm.collegeSource?.kind==='schema'?'Schéma du collège':'Figure du collège';
 const availableModes=algorithm.sourceOnly?[['source',sourceLabel]]:algorithm.collegeSource?[['source',sourceLabel],['overview','Arbre interactif'],['guided','Pas à pas']]:[['overview','Arbre décisionnel'],['guided','Pas à pas']];
 const modes='<div class="algo-modes" role="group" aria-label="Mode de lecture">'+availableModes.map(([mode,label])=>button(label,'mode','data-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'"',state.mode===mode?'selected':'')).join('')+'</div>';
 const heading='<header class="algo-heading"><div><span class="algo-eyebrow">'+esc(algorithm.sdd!=null?'Situation de départ '+String(algorithm.sdd).padStart(3,'0'):(algorithm.situationLabel||'Parcours clinique'))+'</span><h2>'+esc(algorithm.title)+'</h2><p>'+esc(algorithm.scope)+'</p></div>'+modes+'</header>';
 const provenance='<div class="algo-provenance"><span>'+esc(algorithm.provenance||'Parcours pédagogique ATLAS · Sources LiSA EDN 2026 consultées le 12/10/2026')+'</span><a href="'+esc(algorithm.sddUrl||algorithm.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(algorithm.sddLabel||algorithm.sourceLabel||'Consulter la source ↗')+'</a><span>'+esc(algorithm.sourceOnly?'Source originale référencée ; les boutons ouvrent les objectifs de cours associés.':algorithm.collegeSource?'Transposition réalisée par ATLAS ; consulter les précisions et la source du collège.':'Synthèse pédagogique ATLAS ; sources et cours accessibles depuis chaque étape.')+'</span></div>';
 const below='<section class="algo-below" aria-labelledby="algo-below-title" hidden></section>';
 if((state.mode==='source'||algorithm.sourceOnly)&&algorithm.collegeSource)return heading+sourceNotes(algorithm)+collegeSourceView(algorithm)+below+provenance;
 if(state.mode==='overview')return heading+sourceNotes(algorithm)+window.ATLAS_ALGORITHM_TREE.render(algorithm)+below+provenance;
 const trail='<nav class="algo-trail" aria-label="Étapes parcourues">'+path.map((id,i)=>button((i+1)+'. '+nodes.get(id).title,'history','data-index="'+i+'" '+(i===path.length-1?'aria-current="step"':''),i===path.length-1?'current':'')).join('')+'</nav>';
 const missing=state.missing?'<div class="algo-missing" role="status"><strong>Garder la donnée comme inconnue</strong><p>Identifie l’information nécessaire dans cette étape, puis complète l’examen ou le bilan avant de choisir une branche. Consulte le cours et les sources si le résultat reste ambigu.</p>'+button('Revenir à la décision','missing')+'</div>':'';
 const choices=current.choices.length?'<div class="algo-choices" aria-label="Choisir la situation observée">'+current.choices.map(c=>button(c.label,'choose','data-node="'+esc(c.to)+'"','choice')).join('')+'</div>'+button('Il me manque une donnée','missing','','algo-unknown'):'<div class="algo-end">'+(current.kind==='urgent'?'Priorité à la prise en charge urgente.':current.kind==='uncertain'?'L’enquête reste ouverte.':'Fin de cette orientation : poursuivre selon la cause retenue.')+'</div>';
 const stage='<article class="algo-node '+esc(current.kind||'')+'" aria-labelledby="algo-stage-title"><div class="algo-node-top"><span class="algo-eyebrow">Étape '+path.length+'</span>'+kindLabel(current)+'</div><h3 id="algo-stage-title" tabindex="-1">'+esc(current.title)+'</h3>'+information(current)+(current.course?.length?button('Ouvrir le cours associé','inspect','data-node="'+esc(current.id)+'"'):'')+missing+choices+'</article>';
 return heading+sourceNotes(algorithm)+trail+stage+'<div class="algo-navigation">'+button('← Étape précédente','back',path.length<2?'disabled':'')+button('Recommencer le parcours','reset')+'</div>'+below+provenance;
}
function kindLabel(node){const labels={urgent:'Urgence',uncertain:'À préciser',finish:'Orientation'};return node.kind?'<span class="algo-status '+node.kind+'">'+labels[node.kind]+'</span>':'';}
function render(item){
 const list=forItem(item);if(!list.length)return '';
 const state=session(item);

 const pick=a=>'<button type="button" class="algo-pick '+(state.selected===a.id?'active':'')+'" data-algo-action="select" data-algorithm="'+esc(a.id)+'" aria-pressed="'+(state.selected===a.id)+'"><span class="algo-eyebrow">'+esc(a.collegeSource?(a.collegeSource.shortName||'CEP 2026')+' · '+a.collegeSource.reference:(data.collegeInventory?.[item]?'Synthèse ATLAS':(a.sdd!=null?'SDD '+String(a.sdd).padStart(3,'0'):(a.situationLabel||'Parcours clinique'))))+'</span><strong>'+esc(a.title)+'</strong><span>'+esc(a.summary)+'</span></button>';
 const college=list.filter(a=>a.collegeSource),extra=list.filter(a=>!a.collegeSource),inv=data.collegeInventory?.[item];
 const picker=inv?(college.length?'<section class="algo-picker-group"><h2>Schémas et tableaux du collège</h2><div class="algo-picker">'+college.map(pick).join('')+'</div></section>':'')+(extra.length?'<details class="algo-extra-picker" '+(!college.length?'open':'')+'><summary>Synthèses complémentaires ATLAS · '+extra.length+' parcours</summary><div class="algo-picker">'+extra.map(pick).join('')+'</div></details>':''):(list.length>1?'<div class="algo-picker">'+list.map(pick).join('')+'</div>':'');
 const status=inv?'<p class="algo-inventory-note">'+esc(inv.note)+' <a href="'+esc(inv.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Consulter la source du contrôle ↗</a></p>':'';
 return '<section class="algo-root" data-algo-item="'+item+'">'+status+picker+'<div class="algo-stage">'+renderStage(item)+'</div><dialog class="algo-detail" aria-labelledby="algo-detail-title"></dialog></section>';

}
function teaser(item){
 const list=forItem(item);return list.length?'<a class="algo-teaser" href="#item/'+item+'/algorithmes"><div><strong>Algorithmes du collège et parcours cliniques</strong><span>'+esc(list.map(a=>a.title).join(' · '))+'</span></div><span>Ouvrir les algorithmes →</span></a>':'';
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-algo-action]');if(!b)return;
 const root=b.closest('.algo-root');if(!root)return;
 e.preventDefault();const item=Number(root.dataset.algoItem),state=session(item),algorithm=forItem(item).find(a=>a.id===state.selected);
 if(!algorithm)return;
 const path=state.paths[algorithm.id]||(state.paths[algorithm.id]=['entry']);
 const action=b.dataset.algoAction;
 if(action==='close-detail'){
  root.querySelector('.algo-detail').close();const below=root.querySelector('.algo-below');if(below)below.hidden=true;
  const card=[...root.querySelectorAll('.algo-tree-card')].find(c=>c.dataset.node===state.inspected);if(card){card.focus({preventScroll:true});card.scrollIntoView({block:'nearest',inline:'center'});}return;
 }
 if(action==='inspect'||action==='placement'){
  const node=algorithm.nodes.find(n=>n.id===(action==='inspect'?b.dataset.node:state.inspected));if(!node)return;
  showDetail(root,algorithm,node,action==='placement'?b.dataset.placement:coursePlacement);return;
 }
 if(action==='retry-course'){const host=b.closest('.algo-course-content');delete host.dataset.loading;hydrateCourse(host.parentElement,algorithm);return;}
 if(action!=='missing')state.missing=false;
 if(action==='select'){if(!forItem(item).some(a=>a.id===b.dataset.algorithm))return;state.selected=b.dataset.algorithm;if(state.mode==='source'&&!forItem(item).find(a=>a.id===state.selected)?.collegeSource)state.mode='overview';else if(forItem(item).find(a=>a.id===state.selected)?.collegeSource)state.mode=initialMode(forItem(item).find(a=>a.id===state.selected));root.outerHTML=render(item);window.ATLAS_ALGORITHM_TREE.hydrate(document);return;}
 if(action==='mode'){if(!['guided','overview','source'].includes(b.dataset.mode))return;if(algorithm.sourceOnly&&b.dataset.mode!=='source')return;if(b.dataset.mode==='source'&&!algorithm.collegeSource)return;state.mode=b.dataset.mode;}
 if(action==='choose'){
  const current=algorithm.nodes.find(n=>n.id===path[path.length-1]);
  if(!current?.choices.some(c=>c.to===b.dataset.node))return;
  // Revisiting a node trims the path, so loops never create an unbounded breadcrumb.
  const old=path.indexOf(b.dataset.node);if(old>=0)path.splice(old+1);else path.push(b.dataset.node);
 }
 if(action==='jump'){if(!algorithm.nodes.some(n=>n.id===b.dataset.node))return;state.paths[algorithm.id]=[b.dataset.node];state.mode='guided';}
 if(action==='history'){const i=Number(b.dataset.index);if(Number.isInteger(i)&&i>=0&&i<path.length)path.splice(i+1);}
 if(action==='back'&&path.length>1)path.pop();
 if(action==='reset')state.paths[algorithm.id]=['entry'];
 if(action==='missing')state.missing=!state.missing;
 root.querySelector('.algo-stage').innerHTML=renderStage(item);
 window.ATLAS_ALGORITHM_TREE.hydrate(root);
 const focus=root.querySelector('#algo-stage-title');if(focus){focus.focus({preventScroll:true});focus.scrollIntoView({block:'nearest'});}
});
window.ATLAS_ALGORITHMS={forItem,render,teaser};
})();


