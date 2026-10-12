(() => {
'use strict';
const data=window.ATLAS_ALGORITHM_DATA;
if(!data)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessions=new Map();
const forItem=n=>data.algorithms.filter(a=>a.items.includes(Number(n)));
const itemLabel=n=>(window.ATLAS_CATALOG||[]).find(x=>x.numero===n)?.titre||'Item '+n;
const button=(label,action,attrs='',cls='')=>'<button type="button" class="algo-button '+cls+'" data-algo-action="'+action+'" '+attrs+'>'+esc(label)+'</button>';
function session(item){
 if(!sessions.has(item))sessions.set(item,{selected:forItem(item)[0]?.id,mode:'overview',paths:{},missing:false});
 return sessions.get(item);
}
function references(node){
 return '<div class="algo-sources" aria-label="Sources de cette étape">'+node.refs.map(k=>{const s=data.sources[k];return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(s.title)+'">'+esc(s.code)+' · Rang '+esc(s.rank)+' ↗</a>';}).join('')+'</div>';
}
function related(node){
 return node.related?.length?'<div class="algo-related"><strong>Poursuivre dans les fiches</strong>'+node.related.map(n=>'<a href="#item/'+n+'">Item '+n+' · '+esc(itemLabel(n))+' →</a>').join('')+'</div>':'';
}
function information(node){
 return '<div class="algo-body">'+node.body.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div><details class="algo-why"><summary>Pourquoi cette étape ?</summary><p>'+esc(node.why)+'</p></details>'+related(node)+references(node);
}
function renderStage(item){
 const state=session(item),algorithm=forItem(item).find(a=>a.id===state.selected);
 if(!algorithm)return '';
 const path=state.paths[algorithm.id]||(state.paths[algorithm.id]=['entry']);
 const nodes=new Map(algorithm.nodes.map(n=>[n.id,n]));
 const current=nodes.get(path[path.length-1])||algorithm.nodes[0];
 const modes='<div class="algo-modes" role="group" aria-label="Mode de lecture">'+[['overview','Arbre décisionnel'],['guided','Pas à pas']].map(([mode,label])=>button(label,'mode','data-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'"',state.mode===mode?'selected':'')).join('')+'</div>';
 const heading='<header class="algo-heading"><div><span class="algo-eyebrow">Situation de départ '+String(algorithm.sdd).padStart(3,'0')+'</span><h2>'+esc(algorithm.title)+'</h2><p>'+esc(algorithm.scope)+'</p></div>'+modes+'</header>';
 const provenance='<div class="algo-provenance"><span>Parcours pédagogique ATLAS · Sources LiSA EDN 2026 consultées le 12/10/2026</span><a href="'+esc(algorithm.sddUrl)+'" target="_blank" rel="noopener noreferrer">Voir la situation de départ LiSA ↗</a><span>La séquence est une synthèse pédagogique ; les figures originales restent dans les objectifs.</span></div>';
 if(state.mode==='overview')return heading+window.ATLAS_ALGORITHM_TREE.render(algorithm)+provenance;
 const trail='<nav class="algo-trail" aria-label="Étapes parcourues">'+path.map((id,i)=>button((i+1)+'. '+nodes.get(id).title,'history','data-index="'+i+'" '+(i===path.length-1?'aria-current="step"':''),i===path.length-1?'current':'')).join('')+'</nav>';
 const missing=state.missing?'<div class="algo-missing" role="status"><strong>Garder la donnée comme inconnue</strong><p>Identifie l’information nécessaire dans cette étape, puis complète l’examen ou le bilan avant de choisir une branche. Consulte l’objectif LiSA si le résultat reste ambigu.</p>'+button('Revenir à la décision','missing')+'</div>':'';
 const choices=current.choices.length?'<div class="algo-choices" aria-label="Choisir la situation observée">'+current.choices.map(c=>button(c.label,'choose','data-node="'+esc(c.to)+'"','choice')).join('')+'</div>'+button('Il me manque une donnée','missing','','algo-unknown'):'<div class="algo-end">'+(current.kind==='urgent'?'Priorité à la prise en charge urgente.':current.kind==='uncertain'?'L’enquête reste ouverte.':'Fin de cette orientation : poursuivre selon la cause retenue.')+'</div>';
 const stage='<article class="algo-node '+esc(current.kind||'')+'" aria-labelledby="algo-stage-title"><div class="algo-node-top"><span class="algo-eyebrow">Étape '+path.length+'</span>'+kindLabel(current)+'</div><h3 id="algo-stage-title" tabindex="-1">'+esc(current.title)+'</h3>'+information(current)+missing+choices+'</article>';
 return heading+trail+stage+'<div class="algo-navigation">'+button('← Étape précédente','back',path.length<2?'disabled':'')+button('Recommencer le parcours','reset')+'</div>'+provenance;
}
function kindLabel(node){const labels={urgent:'Urgence',uncertain:'À préciser',finish:'Orientation'};return node.kind?'<span class="algo-status '+node.kind+'">'+labels[node.kind]+'</span>':'';}
function render(item){
 const list=forItem(item);if(!list.length)return '';
 const state=session(item);
 const picker=list.length>1?'<div class="algo-picker">'+list.map(a=>'<button type="button" class="algo-pick '+(state.selected===a.id?'active':'')+'" data-algo-action="select" data-algorithm="'+esc(a.id)+'" aria-pressed="'+(state.selected===a.id)+'"><span class="algo-eyebrow">SDD '+String(a.sdd).padStart(3,'0')+'</span><strong>'+esc(a.title)+'</strong><span>'+esc(a.summary)+'</span></button>').join('')+'</div>':'';
 return '<section class="algo-root" data-algo-item="'+item+'">'+picker+'<div class="algo-stage">'+renderStage(item)+'</div><dialog class="algo-detail" aria-labelledby="algo-detail-title"></dialog></section>';
}
function teaser(item){
 const list=forItem(item);return list.length?'<a class="algo-teaser" href="#item/'+item+'/algorithmes"><div><strong>Raisonner à partir d’une situation de départ</strong><span>'+esc(list.map(a=>a.title).join(' · '))+'</span></div><span>Ouvrir les algorithmes →</span></a>':'';
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-algo-action]');if(!b)return;
 const root=b.closest('.algo-root');if(!root)return;
 e.preventDefault();const item=Number(root.dataset.algoItem),state=session(item),algorithm=forItem(item).find(a=>a.id===state.selected);
 if(!algorithm)return;
 const path=state.paths[algorithm.id]||(state.paths[algorithm.id]=['entry']);
 const action=b.dataset.algoAction;
 if(action==='close-detail'){root.querySelector('.algo-detail').close();return;}
 if(action==='inspect'){
  const node=algorithm.nodes.find(n=>n.id===b.dataset.node);if(!node)return;
  const dialog=root.querySelector('.algo-detail');
  dialog.innerHTML='<div class="algo-detail-top">'+(kindLabel(node)||'<span class="algo-eyebrow">Décision</span>')+button('Fermer ×','close-detail')+'</div><h3 id="algo-detail-title">'+esc(node.title)+'</h3>'+information(node)+(node.choices.length?'<div class="algo-detail-branches"><strong>Les branches de cette étape</strong>'+node.choices.map(c=>button(c.label+' →','inspect','data-node="'+esc(c.to)+'"')).join('')+'</div>':'');
  if(!dialog.open)dialog.showModal();else dialog.scrollTop=0;
  return;
 }
 if(action!=='missing')state.missing=false;
 if(action==='select'){if(!forItem(item).some(a=>a.id===b.dataset.algorithm))return;state.selected=b.dataset.algorithm;root.outerHTML=render(item);window.ATLAS_ALGORITHM_TREE.hydrate(document);return;}
 if(action==='mode'){if(!['guided','overview'].includes(b.dataset.mode))return;state.mode=b.dataset.mode;}
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
