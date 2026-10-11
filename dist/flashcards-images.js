(() => {
'use strict';
const data=window.ATLAS_IMAGE_CARDS;if(!data)return;
const cards=data.cards,byId=new Map(cards.map(c=>[c.id,c])),images=window.ATLAS_ILLUSTRATION_DATA.images;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const asset=p=>window.ATLAS_ASSET_URL?window.ATLAS_ASSET_URL(p):p;
const btn=(label,action,extra='',cls='secondary')=>'<button type="button" class="btn '+cls+'" data-image-card-action="'+action+'" '+extra+'>'+label+'</button>';
const filterDefaults=()=>({scope:'media',subject:'',theme:'',morphology:'',status:'all',query:'',length:10,objective:''});
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00'));
const clamp=(v,min,max,defaultValue=0)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):defaultValue;
let ctx=null,limit=30,reader=null,readerTrigger=null,readerZoom=false,courseEpoch=0;
function cleanState(raw){
 const d={reviews:{},session:null,filters:filterDefaults(),favorites:[]};if(!raw||typeof raw!=='object')return d;
 if(raw.reviews&&typeof raw.reviews==='object')for(const [id,v] of Object.entries(raw.reviews)){
  if(!byId.has(id)||!v||!dateOK(v.due))continue;
  d.reviews[id]={ease:clamp(v.ease,1.3,2.8,2.5),intervalDays:clamp(v.intervalDays,1,180,1),repetitions:clamp(v.repetitions,0,1e6),lapses:clamp(v.lapses,0,1e6),reviews:clamp(v.reviews,1,1e6,1),lastGrade:clamp(v.lastGrade,0,3),due:v.due,lastReviewed:dateOK(v.lastReviewed)?v.lastReviewed:''};
 }
 d.favorites=Array.isArray(raw.favorites)?[...new Set(raw.favorites.filter(id=>byId.has(id)))]:[];
 if(raw.filters&&typeof raw.filters==='object'){
  for(const k of ['subject','theme','morphology','query'])if(typeof raw.filters[k]==='string')d.filters[k]=raw.filters[k].slice(0,200);
  if(['all','media','derm'].includes(raw.filters.scope))d.filters.scope=raw.filters.scope;
  if(['all','new','due','hard','favorites'].includes(raw.filters.status))d.filters.status=raw.filters.status;
  if([10,20,40,9999].includes(Number(raw.filters.length)))d.filters.length=Number(raw.filters.length);
  if(data.byObjective[raw.filters.objective])d.filters.objective=raw.filters.objective;
 }
 const s=raw.session;
 if(s&&Array.isArray(s.ids)&&s.ids.length&&s.ids.length<=cards.length&&s.ids.every(id=>byId.has(id))&&new Set(s.ids).size===s.ids.length){
  const index=Number(s.index),grades=s.grades;
  if(Number.isInteger(index)&&index>=0&&index<=s.ids.length&&Array.isArray(grades)&&grades.length===index&&grades.every(g=>Number.isInteger(g)&&g>=0&&g<=3))
   d.session={ids:s.ids.slice(),index,grades:grades.slice(),revealed:!!s.revealed,paused:!!s.paused};
 }
 return d;
}
const state=()=>ctx.state.imageCards;
function ready(){return !!ctx&&document.querySelector('[data-image-cards-root]')}
function current(){const s=state().session;return s&&byId.get(s.ids[s.index])}
function setRoot(html){courseEpoch++;ctx.shell('<div class="image-cards" data-image-cards-root>'+html+'</div>')}
function mount(context,objective){
 ctx=context;ctx.state.imageCards=cleanState(ctx.state.imageCards);
 if(objective&&data.byObjective[objective]){
  const f=state().filters;if(f.objective!==objective){f.objective=objective;f.scope='all';f.subject='';f.theme='';f.morphology='';f.query='';f.status='all';if(state().session)state().session.paused=true;ctx.save();}
 }
 render();
}
function filtered(){
 const f=state().filters;
 return cards.filter(c=>{
  const r=state().reviews[c.id],o=data.objectives[c.objective];
  return(f.scope!=='media'||c.media)&&(f.scope!=='derm'||c.derm)&&(!f.subject||c.subject===f.subject)&&(!f.theme||c.theme===f.theme)&&(!f.morphology||c.morphology===f.morphology)&&(!f.objective||c.objective===f.objective)&&(!f.query||norm([c.title,o.title,c.item,c.description||'',c.theme||''].join(' ')).includes(norm(f.query)))&&(f.status!=='new'||!r)&&(f.status!=='due'||!!r&&r.due<=ctx.today())&&(f.status!=='hard'||!!r&&r.lastGrade<2)&&(f.status!=='favorites'||state().favorites.includes(c.id));
 });
}
function select(id,label,values,selected,all){return '<label class="ic-field" for="'+id+'"><span>'+label+'</span><select class="control" id="'+id+'"><option value="">'+all+'</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(selected===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>'}
function render(){if(state().session&&!state().session.paused)return sessionPage();landing()}
function landing(){
 const d=state(),f=d.filters,seen=Object.keys(d.reviews).length,due=Object.values(d.reviews).filter(r=>r.due<=ctx.today()).length;
 const scopeBase=cards.filter(c=>f.scope==='derm'?c.derm:f.scope==='media'?c.media:true);
 const subjects=[...new Set(scopeBase.map(c=>c.subject))].sort((a,b)=>a.localeCompare(b,'fr'));
 const themes=[...new Set(cards.filter(c=>c.derm).map(c=>c.theme))].sort((a,b)=>a.localeCompare(b,'fr'));
 setRoot('<div class="ic-intro"><div><span class="ic-eyebrow">LE LABORATOIRE VISUEL</span><h1>Un regard. Un réflexe.</h1><p>Observe, formule ta réponse, puis retrouve l’objectif et ses repères de cours.</p></div><div class="ic-total"><strong>'+data.stats.cards+'</strong><span>flashcards images</span></div></div>'+
 '<div class="ic-metrics"><div><strong>'+data.stats.multimediaCovered+' <small>/ '+data.stats.multimediaTotal+'</small></strong><span>objectifs multimédia couverts</span></div><div><strong>'+data.stats.dermImages+'</strong><span>photos dermatologiques décrites</span></div><div><strong>'+seen+'</strong><span>cartes déjà évaluées</span></div><div><strong>'+due+'</strong><span>à revoir aujourd’hui</span></div></div>'+
 (d.session?'<div class="ic-resume"><div><strong>Ta session t’attend.</strong><p>'+d.session.index+' / '+d.session.ids.length+' cartes évaluées. La suite est conservée.</p></div>'+btn('Reprendre →','resume','','coral')+btn('Fermer la session','discard')+'</div>':'')+
 '<div class="ic-workbench"><section class="panel ic-config"><span class="ic-eyebrow">01 / CHOISIR SON TERRAIN</span><h2>Ta prochaine session</h2><div class="ic-scopes" role="group" aria-label="Banque d’images">'+[['media','Contenu multimédia'],['derm','Dermatologie'],['all','Toutes les images']].map(([v,l])=>'<button class="chip '+(f.scope===v?'active':'')+'" data-image-card-action="scope" data-value="'+v+'" aria-pressed="'+(f.scope===v)+'">'+l+'</button>').join('')+'</div>'+
 (f.objective?'<div class="ic-target"><span>Objectif ciblé · '+esc(f.objective)+'</span><strong>'+esc(data.objectives[f.objective].title)+'</strong>'+btn('Retirer ce filtre','clear-objective','','small secondary')+'</div>':'')+
 '<div class="ic-filter-grid">'+select('ic-subject','Spécialité',subjects,f.subject,'Toutes les spécialités')+
 (f.scope==='derm'?select('ic-theme','Thème dermatologique',themes,f.theme,'Tous les thèmes')+select('ic-morphology','Lésion dominante',[...new Set(cards.filter(c=>c.derm).map(c=>c.morphology))].sort((a,b)=>a.localeCompare(b,'fr')),f.morphology,'Toutes les lésions'):'')+
 '<label class="ic-field" for="ic-status"><span>Cartes à travailler</span><select class="control" id="ic-status">'+[['all','Toutes'],['new','Jamais évaluées'],['due','À revoir aujourd’hui'],['hard','Mes difficultés'],['favorites','Mes favoris']].map(([v,l])=>'<option value="'+v+'" '+(f.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="ic-field" for="ic-length"><span>Taille de la session</span><select class="control" id="ic-length">'+[[10,'10 cartes'],[20,'20 cartes'],[40,'40 cartes'],[9999,'Toutes les cartes filtrées']].map(([v,l])=>'<option value="'+v+'" '+(f.length===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div>'+
 '<label class="ic-field" for="ic-query"><span>Rechercher un objectif, une lésion ou un item</span><input class="control" type="search" id="ic-query" value="'+esc(f.query)+'" placeholder="Ex. 187, purpura, radiographie…"></label><div class="ic-start"><div id="ic-selection-count" aria-live="polite"></div>'+btn('Commencer →','start','','coral')+'</div><p class="ic-note">Ordre mélangé. Une carte par image et par objectif ; une même image peut travailler plusieurs objectifs.</p></section>'+
 '<aside class="ic-guide"><span class="ic-eyebrow">02 / APPRENDRE À VOIR</span><h2>Décris avant de nommer.</h2><ol><li><b>Observe.</b><span>Repère le siège, les lésions, leur couleur et leur distribution.</span></li><li><b>Argumente.</b><span>Formule une interprétation et les éléments qui la soutiennent.</span></li><li><b>Vérifie.</b><span>Compare avec la correction et programme ta prochaine révision.</span></li></ol><p>Les photos et documents d’origine sont conservés. Certains comportent déjà des légendes ou annotations.</p><p>Pour les autres spécialités, le verso reprend la légende disponible et le cours de l’objectif. Les descriptions dermatologiques sont rédigées photo par photo.</p></aside></div>'+
 '<section class="ic-bank"><div class="section-heading"><div><h2>Explorer les cartes</h2><p>Ouvre une carte ou rejoins directement son objectif.</p></div>'+btn('Réinitialiser les filtres','reset','','small secondary')+'</div><div id="ic-results"></div></section>'+coverage()+
 '<div class="footer-note">Progression des images incluse dans l’export et l’import depuis Préférences.</div>');
 results();
}
function results(){
 const list=filtered(),n=list.length,count=document.querySelector('#ic-selection-count');if(!count)return;
 count.innerHTML='<strong>'+n+'</strong> carte'+(n>1?'s':'')+' disponible'+(n>1?'s':'');
 document.querySelector('[data-image-card-action="start"]').disabled=!n;
 document.querySelector('#ic-results').innerHTML=n?'<div class="ic-card-list">'+list.slice(0,limit).map(c=>{
  const r=state().reviews[c.id],o=data.objectives[c.objective],status=!r?'Nouvelle':r.due<=ctx.today()?'À revoir':r.lastGrade<2?'À consolider':'Évaluée';
  return '<article class="ic-bank-row"><div class="ic-item-no">'+c.item+'<span>ITEM</span></div><div class="ic-bank-copy"><h3>'+esc(c.title)+'</h3><p>'+esc(o.title)+'</p><span class="ic-mini">'+esc(c.derm?c.theme:c.kind)+' · '+esc(c.objective)+' · Rang '+esc(o.rank)+'</span></div><span class="tag">'+status+'</span>'+btn('Réviser','single','data-id="'+esc(c.id)+'"','small secondary')+'</article>';
 }).join('')+'</div>'+(n>limit?'<div class="load-more">'+btn('Afficher 30 cartes de plus','more')+'</div>':''):'<div class="empty"><h3>Aucune carte avec ces filtres</h3><p>Modifie tes critères ou choisis une autre banque.</p></div>';
}
function coverage(){return '<details class="ic-coverage"><summary>Couverture des objectifs · '+data.stats.multimediaCovered+'/'+data.stats.multimediaTotal+' avec support · '+data.missing.length+' en attente</summary><p>Chaque objectif multimédia disposant d’un support identifié a au moins une carte. Les objectifs ci-dessous restent sans carte image, car leur support n’est pas fourni.</p><ul>'+data.missing.map(o=>'<li><a href="#item/'+o.item+'/'+o.id+'">Item '+o.item+' · '+esc(o.title)+'</a><small>'+esc(o.reason)+'</small></li>').join('')+'</ul><h3>Couverture partielle</h3>'+data.partial.map(o=>'<p><a href="#item/'+o.id.split('-')[0]+'/'+o.id+'">Objectif '+o.id+'</a> · '+esc(o.reason)+'</p>').join('')+'<h3>Sources pédagogiques</h3><p>Photographies et légendes : fichiers LiSA de ton dossier, avec lien source sur chaque carte. Les rappels détaillés des autres spécialités sont repris du cours ATLAS existant.</p><ul>'+data.references.map(s=>'<li><a target="_blank" rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.label)+'</a></li>').join('')+'</ul></details>'}
function start(ids){
 if(!ids){let list=filtered().map(c=>c.id);for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}ids=list.slice(0,state().filters.length)}
 if(!ids.length)return;
 if(state().session){ctx.toast('Reprends ou ferme la session en pause avant d’en commencer une autre.');return}
 state().session={ids,index:0,grades:[],revealed:false,paused:false};ctx.save();sessionPage();focusTitle();
}
function question(c){
 if(c.derm)return 'Décris les lésions observées. Quel diagnostic ou signe clinique proposes-tu ?';
 if(['Scanner / TDM','IRM','Radiographie','Échographie'].includes(c.kind))return 'Identifie l’examen et les anomalies visibles. Quelle interprétation proposes-tu ?';
 if(c.kind==='ECG / tracé')return 'Analyse le tracé et ses anomalies. Quelle conclusion peux-tu argumenter ?';
 if(c.kind==='Algorithme'||c.kind==='Schéma / tableau'||c.kind==='Document')return 'Explique les étapes, critères ou relations de ce document, puis confronte-les à l’objectif de cours.';
 return 'Décris les éléments visibles et identifie ce qu’illustre ce document. Justifie ton interprétation.';
}
function sessionPage(){
 const d=state(),s=d.session;if(!s)return landing();
 if(s.index===s.ids.length){const good=s.grades.filter(g=>g>=2).length;
  setRoot('<section class="ic-complete panel"><span class="ic-eyebrow">SESSION TERMINÉE</span><h1>Ton regard s’affine.</h1><p>'+s.ids.length+' cartes évaluées · '+good+' réponses jugées correctes.</p><div class="ic-metrics"><div><strong>'+s.grades.filter(g=>g===0).length+'</strong><span>à revoir</span></div><div><strong>'+s.grades.filter(g=>g===1).length+'</strong><span>difficiles</span></div><div><strong>'+good+'</strong><span>bien ou faciles</span></div></div><p>Tes prochaines révisions sont enregistrées.</p>'+btn('Retour aux flashcards','discard','','coral')+'</section>');return;
 }
 const c=current(),o=data.objectives[c.objective],img=images[c.imageId],r=d.reviews[c.id],fav=d.favorites.includes(c.id);
 const grades=['À revoir','Difficile','Bien','Facile'];
 setRoot('<div class="ic-session-head"><div><span class="ic-eyebrow">RAPPEL VISUEL</span><h1 tabindex="-1" id="ic-session-title">'+(s.revealed?'À toi de comparer.':'Qu’est-ce que tu observes ?')+'</h1></div>'+btn('Mettre en pause','pause','','small secondary')+'</div><div class="session-progress"><span>Carte '+(s.index+1)+' / '+s.ids.length+'</span><div class="progress-track"><span style="width:'+(s.index/s.ids.length*100)+'%"></span></div><span>'+s.index+' évaluées</span></div>'+
 '<article class="ic-study '+(s.revealed?'revealed':'')+'"><div class="ic-photo-side"><div class="ic-photo-bar"><span>'+(s.revealed?esc(c.kind):'Observe l’image')+'</span>'+btn(fav?'★ Favori':'☆ Favori','favorite','aria-pressed="'+fav+'"','small secondary')+'</div><button class="ic-photo" data-image-card-action="zoom" aria-label="Agrandir l’image à analyser"><img src="'+esc(asset(img.zoom))+'" alt="'+(s.revealed?esc(c.title):'Image à analyser ; correction masquée')+'" decoding="async"><span class="ic-zoom-label">Agrandir ↗</span></button>'+(!s.revealed?'<div class="ic-prompt"><h2>'+question(c)+'</h2><p>Formule ta réponse à voix haute ou note tes arguments avant de retourner la carte.</p>'+btn('Révéler la correction','reveal','','coral')+'<small>Espace pour révéler · 1 à 4 pour t’évaluer</small></div>':'<p class="ic-image-caption">Image originale conservée · '+esc(img.dimensions?.join(' × ')||'')+' pixels</p>')+'</div>'+
 (s.revealed?'<div class="ic-answer"><div class="reading-meta"><span class="tag">Item '+c.item+'</span><span class="tag blue">Rang '+esc(o.rank)+'</span><span class="tag">'+(c.media?'Contenu multimédia':esc(o.rubric))+'</span></div><span class="ic-eyebrow">'+(c.derm?'DIAGNOSTIC / SIGNE DE RÉFÉRENCE':'DOCUMENT DE RÉFÉRENCE')+'</span><h2>'+esc(c.title)+'</h2><div class="ic-objective"><small>OBJECTIF '+esc(o.id)+'</small><p>'+esc(o.title)+'</p></div>'+
 (c.derm?'<section class="ic-description"><h3>Description sur cette image</h3><p>'+esc(c.description)+'</p></section><section><h3>Rappel de cours</h3><ul>'+c.recall.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul></section>':'<section><h3>Légende et repères de la source</h3><p>'+esc(c.caption||c.title)+'</p></section>')+
 (c.reuse?'<p class="ic-note">'+esc(c.reuse)+'</p>':'')+
 '<div class="ic-course" data-card="'+esc(c.id)+'" aria-live="polite"><p>Chargement du cours de cet objectif…</p></div><a class="btn secondary small ic-course-link" href="#item/'+c.item+'/'+c.objective+'">Ouvrir cet objectif dans la fiche ↗</a><details class="ic-sources"><summary>Source de l’image et objectif LiSA</summary>'+c.sources.map(s=>'<p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.code)+'</a> · Rang '+esc(s.rank)+'<br>'+esc(s.title)+(s.caption?'<br>'+esc(s.caption):'')+'</p>').join('')+(img.sourcePages||[]).map(u=>'<p><a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Fichier original sur LiSA ↗</a></p>').join('')+'</details></div>':'')+'</article>'+
 (s.revealed?'<section class="ic-assessment" aria-label="Évaluer ma réponse"><h3>Comment as-tu répondu ?</h3><div class="ic-ratings">'+grades.map((label,g)=>btn('<b>'+label+'</b><small>'+window.ATLAS_SRS.intervalLabel(window.ATLAS_SRS.schedule(r||window.ATLAS_SRS.INITIAL_STATE,g).intervalDays)+' · '+(g+1)+'</small>','grade','data-grade="'+g+'"','ic-rate ic-rate-'+g)).join('')+'</div><p>Évalue ton rappel, pas la simple reconnaissance après lecture.</p></section>':'')
 );
 if(s.revealed)loadCourse(c);
}
function focusTitle(){document.querySelector('#ic-session-title')?.focus({preventScroll:true})}
async function loadCourse(c){
 const epoch=courseEpoch;
 try{
  const item=await ctx.loadItem(c.item);if(epoch!==courseEpoch||!ready())return;
  const target=document.querySelector('.ic-course');if(!target||target.dataset.card!==c.id)return;
  const o=item.objectifs.find(o=>o.id===c.objective),template=document.createElement('template');template.innerHTML=ctx.sanitize(o?.contenu||'',true);
  for(const el of template.content.querySelectorAll('.callout,p'))if(/(?:photo(?:graphie)?|image|illustration|vidéo).*?(?:à ajouter|manquante|à fournir)|aucune (?:photo|image|vidéo).*?(?:disponible|fourni)|Kevin (?:déposera|enrichira|fournira)|^À compléter.*contenu à rédiger/i.test(el.textContent.trim()))el.remove();
  const text=template.content.textContent.trim();
  const hasContent=text.length>30&&!/^À compléter[.\s—–]/.test(text);
  target.innerHTML=hasContent?(c.derm?'<details class="ic-course-details"><summary>Approfondir avec le cours ATLAS</summary><div class="medical">'+template.innerHTML+'</div></details>':'<section><h3>Rappel du cours de cet objectif</h3><div class="medical">'+template.innerHTML+'</div></section>'):'<p class="ic-note">Le cours détaillé de cet objectif reste à compléter dans ton dossier. La légende et les références de l’image sont disponibles ci-dessous.</p>';
  if(!c.derm&&hasContent)target.insertAdjacentHTML('beforeend','<p class="ic-note">Texte repris de la fiche ATLAS existante.</p>');
 }catch(e){if(epoch===courseEpoch){const target=document.querySelector('.ic-course');if(target)target.innerHTML='<p>Le cours n’a pas pu être chargé.</p>'+btn('Réessayer','retry-course','','small secondary')}}
}
function grade(g){
 const s=state().session,c=current();if(!s||s.paused||!s.revealed||!c||!Number.isInteger(g)||g<0||g>3)return;
 const previous=state().reviews[c.id],next=window.ATLAS_SRS.schedule(previous||window.ATLAS_SRS.INITIAL_STATE,g);
 state().reviews[c.id]={...next,due:ctx.addDays(ctx.today(),next.intervalDays),lastReviewed:ctx.today(),lastGrade:g,reviews:(previous?.reviews||0)+1};
 s.grades.push(g);s.index++;s.revealed=false;ctx.state.xp+=g>=2?10:5;ctx.track('cards');ctx.save();sessionPage();focusTitle();window.scrollTo(0,0);
}
function zoom(){
 const c=current();if(!c)return;
 readerTrigger=document.activeElement;readerZoom=false;
 if(!reader){reader=document.createElement('dialog');reader.id='ic-reader';reader.setAttribute('aria-label','Image agrandie');document.body.append(reader);reader.addEventListener('close',()=>{readerTrigger?.focus();document.body.classList.remove('ic-reader-open')});}
 reader.innerHTML='<div class="ic-reader-bar"><strong>Image agrandie</strong>'+btn('Zoom 100 %','reader-zoom','','small secondary')+btn('Fermer ✕','reader-close','','small secondary')+'</div><div class="ic-reader-canvas"><img src="'+esc(asset(images[c.imageId].zoom))+'" alt="'+(state().session.revealed?esc(c.title):'Image à analyser ; correction masquée')+'"></div>';
 reader.showModal();document.body.classList.add('ic-reader-open');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-image-card-action]');if(!b||!ctx)return;e.preventDefault();
 const action=b.dataset.imageCardAction;
 if(action==='reader-close'){reader?.close();return}
 if(action==='reader-zoom'){readerZoom=!readerZoom;reader.querySelector('.ic-reader-canvas').classList.toggle('zoomed',readerZoom);b.textContent=readerZoom?'Adapter à la fenêtre':'Zoom 100 %';return}
 if(!ready())return;
 if(action==='scope'){Object.assign(state().filters,{scope:b.dataset.value,subject:'',theme:'',morphology:'',objective:'',query:''});limit=30;ctx.save();landing()}
 else if(action==='reset'){state().filters=filterDefaults();limit=30;ctx.save();landing()}
 else if(action==='clear-objective'){state().filters.objective='';history.replaceState(null,'','#images');ctx.save();landing()}
 else if(action==='start')start();
 else if(action==='single'){if(byId.has(b.dataset.id))start([b.dataset.id])}
 else if(action==='resume'){state().session.paused=false;ctx.save();render()}
 else if(action==='discard'){state().session=null;ctx.save();landing()}
 else if(action==='pause'){state().session.paused=true;ctx.save();landing()}
 else if(action==='reveal'){if(current()){state().session.revealed=true;ctx.save();sessionPage();document.querySelector('.ic-answer')?.scrollIntoView({block:'start'})}}
 else if(action==='grade')grade(Number(b.dataset.grade));
 else if(action==='favorite'){const id=current()?.id;if(!id)return;state().favorites=state().favorites.includes(id)?state().favorites.filter(x=>x!==id):[...state().favorites,id];ctx.save();b.innerHTML=state().favorites.includes(id)?'★ Favori':'☆ Favori';b.setAttribute('aria-pressed',state().favorites.includes(id))}
 else if(action==='more'){limit+=30;results()}
 else if(action==='zoom')zoom();
 else if(action==='retry-course'&&current())loadCourse(current());
});
document.addEventListener('change',e=>{
 if(!ready())return;const map={'ic-subject':'subject','ic-theme':'theme','ic-morphology':'morphology','ic-status':'status','ic-length':'length'},key=map[e.target.id];if(!key)return;
 state().filters[key]=key==='length'?Number(e.target.value):e.target.value;limit=30;ctx.save();results();
});
document.addEventListener('input',e=>{if(ready()&&e.target.id==='ic-query'){state().filters.query=e.target.value;limit=30;ctx.save();results()}});
document.addEventListener('keydown',e=>{
 if(!ready()||e.repeat||e.metaKey||e.ctrlKey||e.altKey||document.querySelector('.modal')||/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target.tagName))return;
 if(reader?.open){if(e.key==='Escape'){e.preventDefault();reader.close()}return}
 const s=state().session;if(!s||s.paused||!current())return;
 if(e.code==='Space'&&!s.revealed){e.preventDefault();s.revealed=true;ctx.save();sessionPage();document.querySelector('.ic-answer')?.scrollIntoView({block:'start'})}
 else if(s.revealed&&['1','2','3','4'].includes(e.key)){e.preventDefault();grade(Number(e.key)-1)}
});
document.addEventListener('error',e=>{
 const img=e.target;if(img.tagName!=='IMG'||!img.closest('.image-cards,#ic-reader'))return;
 const note=document.createElement('p');note.className='ic-image-error';note.textContent='Cette image n’a pas pu se charger. Ouvre le fichier HTML extrait du ZIP dans ton navigateur.';img.replaceWith(note);
},true);
window.addEventListener('hashchange',()=>{if(reader?.open)reader.close()});
window.ATLAS_IMAGE_FLASHCARDS={mount,cleanState,countObjective:id=>(data.byObjective[id]||[]).length,stats:data.stats};
})();
