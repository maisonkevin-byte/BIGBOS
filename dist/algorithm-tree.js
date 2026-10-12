/* A compact, dependency-free tree view of the existing clinical decisions. */
(() => {
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=290,GAP=34,PAD=38;
const captions={urgent:'Urgence',uncertain:'À préciser',finish:'Orientation'};
function layout(algorithm){
 const lookup=new Map(algorithm.nodes.map((n,i)=>[n.id,{...n,number:i+1}]));
 let uid=0;
 function build(id,ancestors=[]){
  const n=lookup.get(id),branch={node:n,key:'v'+uid++,x:0,depth:0,children:[],returns:[]};
  const chain=[...ancestors,id];
  for(const c of n.choices){
   if(chain.includes(c.to))branch.returns.push(c);
   else{const child=build(c.to,chain);child.label=c.label;branch.children.push(child);}
  }
  // Pack contours at each depth: a short side branch does not reserve an
  // empty column all the way to the bottom of the diagram.
  const contour=[];
  for(const child of branch.children){
   let shift=0;
   child.contour.forEach((c,d)=>{if(contour[d])shift=Math.max(shift,contour[d][1]+GAP-c[0]);});
   child.offset=shift;
   child.contour.forEach((c,d)=>{const pair=[c[0]+shift,c[1]+shift];contour[d]=contour[d]?[Math.min(contour[d][0],pair[0]),Math.max(contour[d][1],pair[1])]:pair;});
  }
  const center=branch.children.length?(branch.children[0].offset+branch.children.at(-1).offset)/2:0;
  for(const child of branch.children)child.offset-=center;
  branch.contour=[[-W/2,W/2],...contour.map(c=>[c[0]-center,c[1]-center])];
  return branch;
 }
 const tree=build('entry'),flat=[],edges=[];
 function place(b,x,depth){b.x=x;b.depth=depth;flat.push(b);for(const c of b.children){place(c,x+c.offset,depth+1);edges.push({from:b,to:c,label:c.label});}}
 place(tree,0,0);
 const left=Math.min(...flat.map(b=>b.x-W/2)),heights=[],levels=[PAD];
 flat.forEach(b=>{b.height=b.node.actions?.length?242:144;heights[b.depth]=Math.max(heights[b.depth]||0,b.height);});
 heights.forEach((h,d)=>levels[d+1]=levels[d]+h+138);
 flat.forEach(b=>{b.x+=PAD-left;b.y=levels[b.depth];});
 return {flat,edges,width:Math.max(...flat.map(b=>b.x+W/2))+PAD,height:Math.max(...flat.map(b=>b.y+b.height+(b.returns.length?30:0)))+PAD,rootX:tree.x,lookup};
}
function render(algorithm){
 const graph=layout(algorithm),marker='arrow-'+algorithm.id;
 const paths=graph.edges.map(e=>{const color=e.to.node.kind||'decision';return '<path class="algo-wire '+color+'" d="M '+e.from.x+' '+(e.from.y+e.from.height)+' V '+(e.from.y+e.from.height+28)+' H '+e.to.x+' V '+(e.to.y-8)+'" marker-end="url(#'+marker+')"/>';}).join('');
 const labels=graph.edges.map(e=>'<span class="algo-branch-label '+esc(e.to.node.kind||'')+'" style="left:'+(e.to.x-W/2)+'px;top:'+(e.from.y+e.from.height+42)+'px;width:'+W+'px">'+esc(e.label)+'</span>').join('');
 const cards=graph.flat.map(b=>'<div class="algo-tree-position" style="left:'+(b.x-W/2)+'px;top:'+b.y+'px;width:'+W+'px"><button type="button" style="height:'+b.height+'px" class="algo-tree-card '+esc(b.node.kind||'decision')+(b.depth===0?' start':'')+'" data-algo-action="inspect" data-node="'+esc(b.node.id)+'" aria-label="'+esc(b.node.title)+' — ouvrir les explications et le cours"><span class="algo-tree-meta"><span>'+String(b.node.number).padStart(2,'0')+'</span><span>'+(b.depth===0?'Point de départ':captions[b.node.kind]||'Décision')+'</span><span aria-hidden="true">↗</span></span><strong>'+esc(b.node.title)+'</strong>'+(b.node.actions?'<span class="algo-tree-actions">'+b.node.actions.map(t=>'<span>'+esc(t)+'</span>').join('')+'</span>':'')+'<span class="algo-card-course">'+(b.node.course?.length?'Ouvrir le cours associé':'Voir les explications')+' →</span></button>'+b.returns.map(c=>'<button type="button" class="algo-tree-return" data-tree-action="return" data-node="'+esc(c.to)+'" title="'+esc(c.label)+'">↶ '+esc(c.label)+' <span>étape '+graph.lookup.get(c.to).number+'</span></button>').join('')+'</div>').join('');
 return '<div class="algo-tree-shell"><div class="algo-tree-toolbar"><span class="algo-tree-caption">'+esc(algorithm.title)+'</span><div class="algo-tree-tools"><button type="button" data-tree-action="out" aria-label="Réduire le zoom">−</button><output class="algo-zoom-label" aria-label="Niveau de zoom">100 %</output><button type="button" data-tree-action="in" aria-label="Augmenter le zoom">+</button><button type="button" data-tree-action="fit">Ajuster</button><button type="button" data-tree-action="expand" aria-expanded="false">⤢ Agrandir</button></div></div><div class="algo-tree-viewport" tabindex="0" role="region" aria-label="Arbre de décision. Faites défiler pour explorer les branches."><div class="algo-tree-space"><div class="algo-tree-canvas" data-width="'+graph.width+'" data-height="'+graph.height+'" data-root-x="'+graph.rootX+'" style="width:'+graph.width+'px;height:'+graph.height+'px"><svg class="algo-tree-wires" width="'+graph.width+'" height="'+graph.height+'" aria-hidden="true"><defs><marker id="'+marker+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>'+paths+'</svg>'+labels+cards+'</div></div></div><div class="algo-tree-footer"><span><i class="decision"></i> Décision</span><span><i class="urgent"></i> Urgence</span><span><i class="uncertain"></i> À préciser</span><span><i class="finish"></i> Orientation</span><span class="algo-tree-tip">Clique sur une case pour les détails · Fais défiler pour explorer</span></div></div>';
}
function scale(shell,value,center=true){
 const viewport=shell.querySelector('.algo-tree-viewport'),canvas=shell.querySelector('.algo-tree-canvas'),space=shell.querySelector('.algo-tree-space');
 const old=Number(shell.dataset.zoom)||1,zoom=Math.max(.25,Math.min(1.5,value));
 const cx=(viewport.scrollLeft+viewport.clientWidth/2)/old,cy=(viewport.scrollTop+viewport.clientHeight/2)/old;
 shell.dataset.zoom=zoom;
 canvas.style.transform='scale('+zoom+')';space.style.width=Number(canvas.dataset.width)*zoom+'px';space.style.height=Number(canvas.dataset.height)*zoom+'px';
 shell.querySelector('.algo-zoom-label').textContent=Math.round(zoom*100)+' %';
 if(center){viewport.scrollLeft=cx*zoom-viewport.clientWidth/2;viewport.scrollTop=cy*zoom-viewport.clientHeight/2;}
}
function fit(shell,readable=false){
 const viewport=shell.querySelector('.algo-tree-viewport'),canvas=shell.querySelector('.algo-tree-canvas');
 const zoom=Math.min(1,(viewport.clientWidth-12)/Number(canvas.dataset.width),readable?1:(viewport.clientHeight-12)/Number(canvas.dataset.height));
 scale(shell,readable?Math.max(.72,zoom):zoom,false);
 viewport.scrollLeft=Number(canvas.dataset.rootX)*Number(shell.dataset.zoom)-viewport.clientWidth/2;viewport.scrollTop=0;
}
function hydrate(scope=document){
 scope.querySelectorAll('.algo-tree-shell:not([data-ready])').forEach(shell=>{
  shell.dataset.ready='true';requestAnimationFrame(()=>{if(shell.isConnected)fit(shell,true);});
 });
}
function closeExpanded(){const shell=document.querySelector('.algo-tree-shell.expanded');if(shell){shell.classList.remove('expanded');const b=shell.querySelector('[data-tree-action="expand"]');b.textContent='⤢ Agrandir';b.setAttribute('aria-expanded','false');document.documentElement.classList.remove('algo-expanded-page');fit(shell,true);b.focus({preventScroll:true});}}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-tree-action]');if(!b)return;
 const shell=b.closest('.algo-tree-shell');if(!shell)return;e.preventDefault();
 const action=b.dataset.treeAction;
 if(action==='in'||action==='out')scale(shell,Number(shell.dataset.zoom)*(action==='in'?1.2:1/1.2));
 if(action==='fit')fit(shell);
 if(action==='expand'){
  if(shell.classList.contains('expanded'))closeExpanded();
  else{shell.classList.add('expanded');document.documentElement.classList.add('algo-expanded-page');b.textContent='↙ Réduire';b.setAttribute('aria-expanded','true');fit(shell);}
 }
 if(action==='return'){
  const card=[...shell.querySelectorAll('.algo-tree-card')].find(c=>c.dataset.node===b.dataset.node);
  if(card){card.focus({preventScroll:true});card.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});card.classList.add('located');setTimeout(()=>card.classList.remove('located'),1400);}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('.algo-detail[open]'))closeExpanded();});
window.addEventListener('hashchange',()=>{document.documentElement.classList.remove('algo-expanded-page');});
window.ATLAS_ALGORITHM_TREE={render,hydrate,closeExpanded};
})();

