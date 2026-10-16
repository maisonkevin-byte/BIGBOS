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
const initialMode=algorithm=>algorithm?.sourceOnly?'source':algorithm?.defaultMode==='overview'?'overview':algorithm?.collegeSource?'source':'overview';
function session(item){
 if(!sessions.has(item))sessions.set(item,{selected:forItem(item)[0]?.id,mode:initialMode(forItem(item)[0])});
 return sessions.get(item);
}
function references(node){
 return '<div class="algo-sources" aria-label="Sources de cette étape">'+node.refs.map(k=>{const s=data.sources[k];return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(s.title)+'">'+esc(s.code)+(s.rank?' · Rang '+esc(s.rank):'')+' ↗</a>';}).join('')+'</div>';
}
function related(node){
 const paths=node.pathways?.length?'<div class="algo-related"><strong>Poursuivre dans les parcours</strong>'+node.pathways.map(p=>button(p.label+' →','select','data-algorithm="'+esc(p.algorithm)+'"')).join('')+'</div>':'';return paths+(node.related?.length?'<div class="algo-related"><strong>Poursuivre dans les fiches</strong>'+node.related.map(n=>'<a href="#item/'+n+'">Item '+n+' · '+esc(itemLabel(n))+' →</a>').join('')+'</div>':'');
}
function information(node,sourceOnly=false){
 const body='<div class="medical">'+window.ATLAS_COURSE.sanitize('<ul class="algo-detail-points">'+node.body.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>')+'</div>';
 const actions=node.actions?.length?'<div class="algo-body"><h4>À faire</h4><div class="medical">'+window.ATLAS_COURSE.sanitize('<ul class="algo-detail-actions">'+node.actions.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>')+'</div></div><details class="algo-why"><summary>Précisions de cette étape</summary>'+body+'</details>':'<div class="algo-body">'+body+'</div>';
 return actions+'<details class="algo-why"><summary>'+(sourceOnly?'Pourquoi ce lien de cours ?':'Pourquoi cette étape ?')+'</summary><div class="medical">'+window.ATLAS_COURSE.sanitize('<p>'+esc(node.why)+'</p>')+'</div></details>'+related(node)+references(node);
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
 const sourceLabel=algorithm.collegeSource?.shortName==='LiSA'?'Figure LiSA':algorithm.collegeSource?.kind==='table'?'Tableau du collège':algorithm.collegeSource?.kind==='schema'?'Schéma du collège':'Figure du collège';
 const availableModes=algorithm.sourceOnly?[['source',sourceLabel]]:algorithm.collegeSource?[['source',sourceLabel],['overview','Arbre interactif']]:[['overview','Arbre décisionnel']];
 const modes='<div class="algo-modes" role="group" aria-label="Mode de lecture">'+availableModes.map(([mode,label])=>button(label,'mode','data-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'"',state.mode===mode?'selected':'')).join('')+'</div>';
 const heading='<header class="algo-heading"><div><span class="algo-eyebrow">'+esc(algorithm.sdd!=null?'Situation de départ '+String(algorithm.sdd).padStart(3,'0'):(algorithm.situationLabel||'Parcours clinique'))+'</span><h2>'+esc(algorithm.title)+'</h2><p>'+esc(algorithm.scope)+'</p></div>'+modes+'</header>';
 const provenance='<div class="algo-provenance"><span>'+esc(algorithm.provenance||'Parcours pédagogique ATLAS · Sources LiSA EDN 2026 consultées le 12/10/2026')+'</span><a href="'+esc(algorithm.sddUrl||algorithm.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(algorithm.sddLabel||algorithm.sourceLabel||'Consulter la source ↗')+'</a><span>'+esc(algorithm.sourceOnly?'Source originale référencée ; les boutons ouvrent les objectifs de cours associés.':algorithm.collegeSource?'Transposition réalisée par ATLAS ; consulter les précisions et la source du collège.':'Synthèse pédagogique ATLAS ; sources et cours accessibles depuis chaque étape.')+'</span></div>';
 const below='<section class="algo-below" aria-labelledby="algo-below-title" hidden></section>';
 if((state.mode==='source'||algorithm.sourceOnly)&&algorithm.collegeSource)return heading+sourceNotes(algorithm)+collegeSourceView(algorithm)+below+provenance;
 return heading+sourceNotes(algorithm)+window.ATLAS_ALGORITHM_TREE.render(algorithm)+below+provenance;
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
 if(action==='select'){if(!forItem(item).some(a=>a.id===b.dataset.algorithm))return;state.selected=b.dataset.algorithm;if(state.mode==='source'&&!forItem(item).find(a=>a.id===state.selected)?.collegeSource)state.mode='overview';else if(forItem(item).find(a=>a.id===state.selected)?.collegeSource)state.mode=initialMode(forItem(item).find(a=>a.id===state.selected));root.outerHTML=render(item);window.ATLAS_ALGORITHM_TREE.hydrate(document);return;}
 if(action==='mode'){if(!['overview','source'].includes(b.dataset.mode))return;if(algorithm.sourceOnly&&b.dataset.mode!=='source')return;if(b.dataset.mode==='source'&&!algorithm.collegeSource)return;state.mode=b.dataset.mode;}
 root.querySelector('.algo-stage').innerHTML=renderStage(item);
 window.ATLAS_ALGORITHM_TREE.hydrate(root);
});
function select(item,id){const a=forItem(item).find(a=>a.id===id);if(!a)return false;const state=session(Number(item));state.selected=id;state.mode=initialMode(a);return true;}
window.ATLAS_ALGORITHMS={forItem,render,teaser,select};
})();



