(() => {
  'use strict';
  const data=window.ATLAS_ILLUSTRATION_DATA||{images:{},byObjective:{},byItem:{},stats:{}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset=path=>window.ATLAS_ASSET_URL?window.ATLAS_ASSET_URL(path):path;
  const entries=id=>data.byObjective[id]||[];
  const sourceLink=source=>'<a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.code)+'</a> · Rang '+esc(source.rank)+'<span>'+esc(source.title)+'</span>';
  let reader=null,readerEntries=[],readerIndex=0,readerObjective='',zoomed=false,trigger=null;
  function objectiveBadge(id){const n=entries(id).length;return n?'<span class="objective-image-count">'+n+' image'+(n>1?'s':'')+'</span>':''}
  function pathwayLink(image){
    const link=image.interactivePathway;if(!link)return '';
    return '<div class="illustration-pathway"><p>'+esc(link.note)+'</p>'+(link.pathway?'<a class="btn secondary small" data-illustration-pathway href="#item/'+link.item+'/algorithmes/'+esc(link.pathway)+'">'+(link.decision?'Ouvrir la transcription interactive':'Ouvrir le parcours associé')+' →</a>':'')+'</div>';
  }
  function objectiveImages(objective){
    const list=entries(objective.id);
    if(!list.length)return '';
    return '<section class="objective-illustrations" aria-label="Illustrations de cet objectif"><div class="illustration-heading"><h3>Les images de cet objectif</h3><span>'+list.length+' vue'+(list.length>1?'s':'')+'</span></div><div class="objective-image-grid">'+list.map((entry,index)=>{
      const image=data.images[entry.imageId];
      return '<figure class="objective-image"><button type="button" class="objective-image-button" data-illustration-action="open" data-objective="'+esc(objective.id)+'" data-index="'+index+'" aria-label="Agrandir : '+esc(image.title)+'"><img data-atlas-src="'+esc(image.preview)+'" alt="'+esc(image.title)+'" loading="lazy"><span class="image-enlarge">Agrandir ↗</span></button><figcaption><div class="image-kind">'+(image.algorithm?'Algorithme / arbre décisionnel':image.format==='PDF'?'Page de PDF':'Illustration LiSA')+'</div><p>'+esc(image.title)+'</p>'+pathwayLink(image)+'<details class="illustration-source"><summary>Objectif source et légende</summary>'+entry.sources.map(source=>'<div>'+sourceLink(source)+(source.caption&&source.caption!==image.title?'<p>'+esc(source.caption)+'</p>':'')+'</div>').join('')+'</details></figcaption></figure>';
    }).join('')+'</div><p class="illustration-hint">Clique sur une image pour lire les détails, zoomer ou ouvrir l’original. Source : LiSA 2026.</p></section>';
  }
  function hydrate(root){
    for(const image of root.querySelectorAll('img[data-atlas-src]')){
      const objective=image.closest('details.objective');
      if(objective&&!objective.open)continue;
      image.src=asset(image.dataset.atlasSrc);
      image.removeAttribute('data-atlas-src');
    }
  }
  function ensureReader(){
    if(reader)return;
    reader=document.createElement('dialog');reader.id='atlas-illustration-reader';reader.setAttribute('aria-label','Illustration de l’objectif');
    document.body.append(reader);
    reader.addEventListener('close',()=>{document.body.classList.remove('illustration-reader-open');trigger?.focus()});
    reader.addEventListener('click',event=>{if(event.target===reader){const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)reader.close()}});
  }
  function renderReader(){
    const entry=readerEntries[readerIndex],image=data.images[entry.imageId];
    reader.innerHTML='<div class="illustration-reader-top"><div><strong>Objectif '+esc(readerObjective)+'</strong><span>Illustration '+(readerIndex+1)+' / '+readerEntries.length+'</span></div><button type="button" class="icon-btn" data-illustration-action="close" aria-label="Fermer l’illustration">✕</button></div><div class="illustration-reader-body"><div class="illustration-reader-canvas '+(zoomed?'zoomed':'')+'"><img src="'+esc(asset(image.zoom))+'" alt="'+esc(image.title)+'"></div><aside><span class="image-kind">'+(image.algorithm?'Algorithme / arbre décisionnel':image.format==='PDF'?'Document PDF':image.format)+'</span><h2>'+esc(image.title)+'</h2>'+pathwayLink(image)+'<p class="illustration-dimensions">Original conservé · '+esc(image.dimensions?.join(' × ')||'')+' pixels</p><div class="illustration-source-list">'+entry.sources.map(source=>'<div>'+sourceLink(source)+(source.caption&&source.caption!==image.title?'<p>'+esc(source.caption)+'</p>':'')+'</div>').join('')+'</div><a class="btn secondary small" href="'+esc(asset(image.originalPath))+'" target="_blank" rel="noopener">'+(image.format==='PDF'?'Ouvrir le PDF original':'Ouvrir l’image originale')+'</a><a class="text-btn image-download" href="'+esc(asset(image.originalPath))+'" download="'+esc(image.filename||image.originalPath.split('/').pop())+'">Enregistrer l’original</a></aside></div><div class="illustration-reader-bottom"><button class="btn secondary small" data-illustration-action="previous" '+(readerIndex===0?'disabled':'')+'>← Précédente</button><button class="btn secondary small" data-illustration-action="zoom">'+(zoomed?'Adapter à la fenêtre':'Zoomer')+'</button><button class="btn secondary small" data-illustration-action="next" '+(readerIndex===readerEntries.length-1?'disabled':'')+'>Suivante →</button></div>';
  }
  function open(objective,index,button){
    readerEntries=entries(objective);readerObjective=objective;readerIndex=Math.max(0,Math.min(index,readerEntries.length-1));
    if(!readerEntries.length)return;
    zoomed=false;trigger=button;ensureReader();renderReader();reader.showModal();document.body.classList.add('illustration-reader-open');
  }
  function move(delta){const next=readerIndex+delta;if(next<0||next>=readerEntries.length)return;readerIndex=next;zoomed=false;renderReader()}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-illustration-pathway]')){reader?.close();document.querySelectorAll('dialog.algo-detail[open]').forEach(dialog=>dialog.close());return;}
    const button=event.target.closest('[data-illustration-action]');if(!button)return;event.preventDefault();
    const action=button.dataset.illustrationAction;
    if(action==='open')open(button.dataset.objective,Number(button.dataset.index),button);
    else if(action==='close')reader?.close();
    else if(action==='previous')move(-1);
    else if(action==='next')move(1);
    else if(action==='zoom'){zoomed=!zoomed;renderReader()}
  });
  document.addEventListener('toggle',event=>{if(event.target.matches?.('details.objective')&&event.target.open)hydrate(event.target)},true);
  document.addEventListener('keydown',event=>{
    if(!reader?.open)return;
    if(event.key==='ArrowRight'){event.preventDefault();move(1)}
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
  });
  document.addEventListener('error',event=>{
    const image=event.target;if(image.tagName!=='IMG'||!image.closest('.objective-illustrations,#atlas-illustration-reader'))return;
    const notice=document.createElement('p');notice.className='illustration-hint';notice.textContent='Cette image n’a pas pu s’afficher. Ouvre le fichier ATLAS-EDN.html extrait du ZIP dans ton navigateur.';image.replaceWith(notice);
  },true);
  window.ATLAS_ILLUSTRATIONS={objectiveImages,objectiveBadge,hydrate,countItem:id=>data.byItem[id]||0,countObjective:id=>entries(id).length,stats:data.stats};
})();

