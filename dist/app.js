(() => {
'use strict';
const catalog=window.ATLAS_CATALOG||[],meta=window.ATLAS_META||{};
const cardIndex=window.ATLAS_CARD_INDEX||[];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('fr-FR');
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const localDay=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return localDay(x)};
const today=()=>localDay();
const STORAGE='atlas-studio-v1';
const readingScale=value=>Math.max(.9,Math.min(1.8,Math.round((Number(value)||1)*10)/10));
const defaults=()=>({version:1,name:'Kevin',goal:20,theme:'light',sidebarCollapsed:false,readingScale:1,favorites:[],objectiveFavorites:[],mastered:{},objectiveAwards:{},notes:{},errors:[],plans:[],srs:{},imageCards:null,activity:{},xp:0,lastItem:null,focusSeconds:0});
let state=defaults(),storageOk=true;
try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s?.version===1)state={...state,...s};}catch(e){storageOk=false}
state.objectiveFavorites=cleanObjectiveFavoriteIds(state.objectiveFavorites);
let objectiveFilter='all',favoriteRows=[],favoriteLoadFailed=false,objectiveFavoriteFilter={query:'',subject:''};
let view='home',tab='objectifs',currentItem=null,session=null,filter={query:'',subject:'',status:'all',limit:48},mode='mix',weekOffset=0;
let timer={seconds:25*60,duration:25*60,running:false,end:0,handle:null},toastHandle,routeEpoch=0;
const iconPaths={
home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',book:'M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3ZM12 6v15',
cards:'M7 4h12v15H7ZM3 8v13h12',bolt:'m13 2-9 12h7l-1 8 10-12h-8Z',calendar:'M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4',chart:'M4 3v18h17M8 16v-4M13 16V8M18 16V5',error:'M12 3 2 21h20ZM12 9v5M12 17v1',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
arrow:'M5 12h14m-6-6 6 6-6 6',chevron:'m8 5 7 7-7 7',down:'m5 9 7 7 7-7',check:'m5 12 4 4L20 5',close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',star:'m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1Z',
clock:'M12 8v5l3 2M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0',flame:'M12 2c2 7-5 7-2 12 3 1 4-2 4-5 7 6 6 13-3 13C1 22 1 11 7 7c-1 6 1 5 2 3s1-5 3-8',target:'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l9-9M16 3h5v5',
heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',brain:'M12 4c-4-4-8 0-6 3-5 0-4 7-2 7-2 5 4 9 8 5 4 4 10 0 8-5 2 0 3-7-2-7 2-3-2-7-6-3ZM12 4v15M6 7l2 3M4 14h4M18 7l-2 3M20 14h-4',
pulse:'M2 12h4l3-8 5 16 3-8h5',sun:'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
moon:'M20 15A9 9 0 1 1 9 3 7 7 0 0 0 20 15',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 4 3-1 3 4-2 3 2 3-3 4-3-1-1 4h-4l-1-4-3 1-3-4 2-3-2-3 3-4 3 1Z',
download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4',play:'m8 4 12 8-12 8Z',pause:'M8 5v14M16 5v14',reset:'M3 10a9 9 0 1 1 1 8M3 3v7h7',menu:'M4 6h16M4 12h16M4 18h16',trophy:'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H3v3a5 5 0 0 0 5 5M16 5h5v3a5 5 0 0 1-5 5M12 14v6M8 21h8',leaf:'M20 3C8 2 1 9 6 17s17 1 14-14ZM5 20 16 9',info:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 11v6M12 7v1',trash:'M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3M10 10v7M14 10v7',edit:'m3 17 13-13 4 4L7 21H3ZM14 6l4 4',checklist:'M9 6h12M9 12h12M9 18h12M2 6l1 1 3-3M2 12l1 1 3-3M2 18l1 1 3-3'
};
const icon=(name,cls='')=>'<svg class="icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(iconPaths[name]||iconPaths.book)+'"/></svg>';
const btn=(label,action,cls='',extra='')=>'<button class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const subjects=[...new Set(catalog.map(c=>c.matiere))].sort((a,b)=>a.localeCompare(b,'fr'));
function save(){storageOk=account?account.save(state):false;if(!storageOk)toast('La sauvegarde locale est indisponible. Garde cette page ouverte et exporte tes données.')}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>$('#toast').classList.remove('visible'),3500)}
function activity(){return state.activity[today()]||{cards:0,objectives:0,focus:0}}
function track(type,amount=1){state.activity[today()]={cards:0,objectives:0,focus:0,...state.activity[today()]};state.activity[today()][type]+=amount;save()}
function streak(){let d=today(),n=0;const active=x=>{const a=state.activity[x];return a&&(a.cards+a.objectives+a.focus>0)};if(!active(d))d=addDays(d,-1);while(active(d)&&n<10000){n++;d=addDays(d,-1)}return n}
function masteredCount(item){return Object.keys(state.mastered).filter(k=>state.mastered[k]&&k.startsWith(item+'-')).length}
const dueCount=()=>Object.values(state.srs).filter(x=>x.due<=today()).length;
const options=(selected='',all='Toutes les spécialités')=>'<option value="">'+all+'</option>'+subjects.map(s=>'<option '+(s===selected?'selected':'')+' value="'+esc(s)+'">'+esc(s)+'</option>').join('');
function sanitize(html,hasIllustrations=false){
 const t=document.createElement('template');t.innerHTML=String(html||'');
 if(hasIllustrations)for(const note of t.content.querySelectorAll('.callout'))if(/^Photo à ajouter\./.test(note.textContent.trim()))note.remove();
 const allowed=new Set('P BR STRONG B EM I U UL OL LI TABLE THEAD TBODY TFOOT TR TH TD CAPTION DIV SPAN H2 H3 H4 H5 FIGURE FIGCAPTION IMG A BLOCKQUOTE SUP SUB HR DETAILS SUMMARY MARK CODE'.split(' '));
 for(const el of [...t.content.querySelectorAll('*')]){
  if(!allowed.has(el.tagName)){el.remove();continue}
  for(const at of [...el.attributes]){
   if(!['class','href','src','alt','title','colspan','rowspan','loading'].includes(at.name))el.removeAttribute(at.name);
  }
  const keywords=[...el.classList].filter(c=>c.startsWith('kw-'));
  if(keywords.length){
   const label=el.textContent.replace(/\s+/g,' ').trim();
   const shortTerm=['SPAN','STRONG','B','EM','I','MARK','SUP','SUB'].includes(el.tagName)&&label.length<=55&&label.split(/\s+/).length<=5&&!/[!?;]|\.(?:\s|$)|:\s/.test(label)&&!/(?:^|\s)(?:est|sont|doit|doivent|peut|peuvent|correspond|nécessite|impose)(?:\s|$)/i.test(label);
   if(!shortTerm)el.classList.remove(...keywords);
  }
  if(el.tagName==='A'){const href=el.getAttribute('href')||'';if(!/^(https?:|#)/i.test(href))el.removeAttribute('href');else{el.target='_blank';el.rel='noopener noreferrer'}}
  if(el.tagName==='IMG'){const src=el.getAttribute('src')||'';if(!/^https:\/\//i.test(src)){const msg=document.createElement('p');msg.className='source-note';msg.textContent='Illustration du projet source à reconnecter : '+(el.alt||'image');el.replaceWith(msg)}else{el.loading='lazy';el.addEventListener('error',()=>{el.alt='Illustration indisponible dans le projet source'})}}
 }
 return window.ATLAS_COURSE_READING.format(t.innerHTML);
}
function loadScript(src,key){if(window[key])return Promise.resolve(window[key]);return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve(window[key]);s.onerror=()=>{s.remove();reject(Error('Chargement impossible'))};document.head.append(s)})}
const itemPromises={};
async function loadItem(n){if(window.ATLAS_ITEMS?.[n])return window.ATLAS_ITEMS[n];if(!itemPromises[n])itemPromises[n]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='data/items/'+Number(n)+'.js'+([132,299,340,341,343].includes(Number(n))?'?v=20261015-neurofinal-1':[116,144,213,351,352,353].includes(Number(n))?'?v=20261014-final-checks-1':[209,210,309,359,360].includes(Number(n))?'?v=20261014-pneumo2-2':[110,154,186,188,203,204,205,206,207,208].includes(Number(n))?'?v=20261014-pneumo1-1':[72,73,74,75,76,77,78,79,80,121].includes(Number(n))?'?v=20261014-psy7280-1':(Number(n)>=62&&Number(n)<=71)?'?v=20261013-psy6271-1':[15,55,58,60,61].includes(Number(n))?'?v=20261013-psy1-1':[105,106,107,108,109].includes(Number(n))?'?v=20261013-neuro105109-1':[100,101,102,103,104].includes(Number(n))?'?v=20261013-neuro100104-1':[97,98,99].includes(Number(n))?'?v=20261012-neuro9799-1':[94,95,96].includes(Number(n))?'?v=20261012-neuro9496-1':Number(n)===93?'?v=20261012-neuro93-1':Number(n)===92?'?v=20261012-neuro92-1':Number(n)===91?'?v=20261012-neuro91-1':Number(n)===247?'?v=20261012-notion247-1':Number(n)===240?'?v=20261012-cours1':'');s.onload=()=>resolve(window.ATLAS_ITEMS[n]);s.onerror=()=>{delete itemPromises[n];s.remove();reject(Error('Cette fiche ne peut pas être chargée. Réessaie.'))};document.head.append(s)});return itemPromises[n]}
window.ATLAS_COURSE={loadItem,sanitize};
function shell(content){
 const names={home:'Vue d’ensemble',catalog:'Mes fiches','objective-favorites':'Objectifs favoris',review:'Rappel actif',images:'Flashcards images',errors:'Carnet d’erreurs',planning:'Mon planning',stats:'Ma progression',focus:'Mode focus',item:'Mes fiches',login:'Connexion',profile:'Mon profil'};
 const nav=[['home','home','Vue d’ensemble'],['catalog','book','Mes fiches'],['objective-favorites','star','Objectifs favoris'],['review','cards','Rappel actif'],['images','search','Flashcards images'],['errors','error','Carnet d’erreurs'],['planning','calendar','Mon planning'],['stats','chart','Ma progression'],[account?.info().user?'profile':'login','lock',account?.info().user?'Mon profil':'Connexion']];
 document.documentElement.classList.toggle('dark',state.theme==='dark');
 $('#app').innerHTML='<aside class="sidebar" id="atlas-sidebar" aria-label="Navigation principale"><button class="icon-btn sidebar-close" data-action="menu" aria-controls="atlas-sidebar" aria-label="Replier le menu">'+icon('close')+'</button><a class="brand" href="#home"><span class="brandmark">✳</span><span>ATLAS<small>MÉDECINE · EDN</small></span></a><div class="nav-label">Mon espace</div><nav class="nav">'+nav.map(([k,i,l])=>'<a href="#'+k+'" class="'+(view===k||(view==='item'&&k==='catalog')?'active':'')+'" '+(view===k?'aria-current="page"':'')+'>'+icon(i)+l+(k==='objective-favorites'?'<span class="nav-count" data-objective-favorite-count '+(!state.objectiveFavorites.length?'hidden':'')+'>'+state.objectiveFavorites.length+'</span>':'')+(k==='review'&&dueCount()?'<span class="nav-count">'+dueCount()+'</span>':'')+'</a>').join('')+'</nav><div class="nav-label">À mon rythme</div><nav class="nav"><a href="#focus" class="'+(view==='focus'?'active':'')+'">'+icon('clock')+'Mode focus</a><button data-action="settings" class="text-btn" style="padding:14px 15px">'+icon('settings')+' Préférences</button></nav><div class="sidebar-bottom"><div class="sidebar-note">'+icon('leaf')+'<strong>Un peu, chaque jour.</strong>La régularité fait la différence. Garde aussi du temps pour souffler.</div><div class="profile"><span class="avatar">'+esc(state.name.slice(0,1).toUpperCase())+'</span><div><strong>'+esc(state.name)+'</strong><small>'+ (account?.info().user?'Compte connecté':'Mode invité') +'</small></div><button data-action="settings" aria-label="Préférences">'+icon('settings')+'</button></div></div></aside><button class="sidebar-backdrop" data-action="close-navigation" aria-label="Fermer le menu" tabindex="-1" hidden></button><div class="workspace"><header class="topbar"><button class="icon-btn sidebar-toggle" data-action="menu" aria-controls="atlas-sidebar" aria-expanded="true" aria-label="Replier le menu" title="Replier le menu">'+icon('menu')+'</button><div class="crumb"><span>Mon espace /</span><strong>'+names[view]+'</strong></div><div class="reading-controls" role="group" aria-label="Taille du texte de lecture"><span class="reading-controls-label">Lecture</span><button type="button" data-action="reading-smaller" aria-label="Réduire la taille du texte" title="Réduire le texte">A−</button><button type="button" data-action="reading-reset" aria-label="Revenir à la taille normale" title="Revenir à 100 %"><span id="reading-size-value" aria-live="polite">100 %</span></button><button type="button" data-action="reading-larger" aria-label="Agrandir la taille du texte" title="Agrandir le texte">A+</button></div><button class="topbar-search" data-action="search" aria-label="Rechercher un item">'+icon('search')+'<span>Rechercher un item...</span><kbd class="key">⌘ K</kbd></button><div class="top-actions"><span class="date">'+new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})+'</span><button class="icon-btn" data-action="theme" aria-label="'+(state.theme==='dark'?'Activer le thème clair':'Activer le thème sombre')+'">'+icon(state.theme==='dark'?'sun':'moon')+'</button><a href="#'+(account?.info().user?'profile':'login')+'" class="avatar account-top-link" aria-label="'+(account?.info().user?'Mon profil':'Me connecter')+'">'+esc(state.name.slice(0,1).toUpperCase())+'</a></div></header><main id="main" class="main"><a href="#profile" class="notice account-notice" data-account-notice hidden></a>'+content+'</main></div>';
 syncSidebar();syncReading();if(account)accountStatus(account.info());
}
const compactNavigation=matchMedia('(max-width: 1100px)');
function closeNavigation(){ $('.sidebar')?.classList.remove('open');syncSidebar(); }
function syncSidebar(){
 const sidebar=$('.sidebar');if(!sidebar)return;
 const mobile=compactNavigation.matches;
 const collapsed=state.sidebarCollapsed===true,expanded=mobile?sidebar.classList.contains('open'):!collapsed;
 document.documentElement.classList.toggle('sidebar-collapsed',collapsed);
 const toggle=$('.sidebar-toggle'),close=$('.sidebar-close');
 const drawerOpen=mobile&&expanded,wasOpen=sidebar.dataset.drawerOpen==='true';
 document.documentElement.classList.toggle('navigation-open',drawerOpen);
 $('.workspace').inert=drawerOpen;
 const backdrop=$('.sidebar-backdrop');if(backdrop)backdrop.hidden=!drawerOpen;
 if(mobile)sidebar.setAttribute('role','dialog');else sidebar.removeAttribute('role');
 if(drawerOpen)sidebar.setAttribute('aria-modal','true');else sidebar.removeAttribute('aria-modal');
 sidebar.dataset.drawerOpen=String(drawerOpen);
 if(!expanded&&sidebar.contains(document.activeElement))toggle?.focus({preventScroll:true});
 sidebar.inert=!expanded;sidebar.setAttribute('aria-hidden',String(!expanded));
 if(drawerOpen&&!wasOpen)close?.focus({preventScroll:true});
 for(const control of [toggle,close])if(control){
  control.setAttribute('aria-expanded',String(expanded));
  control.setAttribute('aria-label',expanded?'Replier le menu':'Ouvrir le menu');
  control.setAttribute('title',expanded?'Replier le menu':'Ouvrir le menu');
 }
}
function syncReading(){
 const scale=readingScale(state.readingScale);
 document.documentElement.style.setProperty('--reading-scale',String(scale));
 const label=$('#reading-size-value');if(label)label.textContent=Math.round(scale*100)+' %';
 const smaller=$('[data-action="reading-smaller"]'),larger=$('[data-action="reading-larger"]');
 if(smaller)smaller.disabled=scale<=.9;if(larger)larger.disabled=scale>=1.8;
}
function colorLegend(item){if(item?.courseEdition?.source==='notion')return '<div class="notion-legend" aria-label="Repères de ton cours Notion"><span class="notion-swatches" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><strong>Tes repères Notion</strong><p>Couleurs et surlignages repris de tes cours · Objectifs relus et complétés</p><a href="'+esc(item.courseEdition.notionUrl)+'" target="_blank" rel="noopener noreferrer">Ouvrir mon cours ↗</a></div>';return '<div class="course-legend" aria-label="Code couleur du cours"><span class="course-legend-title">Repères</span><span class="legend-definition">Définition</span><span class="legend-clinical">Clinique / diagnostic</span><span class="legend-cause">Cause</span><span class="legend-exam">Examens</span><span class="legend-treatment">Prise en charge</span><span class="legend-caution">Piège</span><span class="legend-alert">Urgence / contre-indication</span></div>'}
function intro(title,description,right=''){return '<div class="page-intro"><div><h1>'+title+'</h1><p>'+description+'</p></div>'+right+'</div>'}
const footer=()=>'<div class="footer-note">'+icon('lock')+'<span data-sync-label>'+syncLabels[account?.info().status||'guest']+'</span> <a class="text-btn" href="#'+(account?.info().user?'profile':'login')+'">'+(account?.info().user?'Mon profil':'Créer mon compte')+'</a></div>';
function home(){
 const a=activity(),done=Object.values(state.mastered).filter(Boolean).length,level=Math.floor(state.xp/250)+1;
 const rec=catalog.find(x=>x.numero===state.lastItem)||catalog.find(x=>x.numero===247);
 const weekStart=addDays(today(),-((new Date().getDay()+6)%7));
 const days=Array.from({length:7},(_,i)=>addDays(weekStart,i));
 const special=[['Cardiologie','heart','#fae9e3','#c48373'],['Neurologie','brain','#eceafa','#9a88b5'],['Pédiatrie','leaf','#edf3df','#91a674'],['Infectiologie','pulse','#e5eff6','#7a9bb1']];
 shell(intro('Bonjour '+esc(state.name)+' <span class="welcome-wave">☀</span>','Chaque notion comprise te rapproche de ton objectif.','<span class="pill"><i></i> Ton espace personnel</span>')+
 '<div class="dashboard-grid"><div><section class="hero"><img class="hero-art" src="https://d8j0ntlcm91z4.cloudfront.net/user_3JReg26I6h5Ru20C6jgFBIyo2Sb/hf_20261011_120237_0725b3a2-3fde-497c-926c-67d95574ffee.png" alt=""><div class="hero-content"><div class="hero-kicker">'+icon('bolt')+'Ta prochaine session</div><h2>Une notion de plus.<br>Un pas vers demain.</h2><p>Réactive tes connaissances et transforme tes hésitations en réflexes.</p>'+btn('Lancer ma session '+icon('play'),'quick-session','coral')+'</div><span class="hero-badge">10 cartes · à ton rythme</span></section>'+
 '<div class="quick-stats"><div class="stat"><div class="stat-icon">'+icon('cards')+'</div><div><strong>'+num(a.cards)+'<span class="muted" style="font-size:12px"> / '+state.goal+'</span></strong><small>Cartes revues aujourd’hui</small></div></div><div class="stat"><div class="stat-icon">'+icon('flame')+'</div><div><strong>'+streak()+' <span style="font-size:12px">jour'+(streak()>1?'s':'')+'</span></strong><small>De régularité</small></div></div><div class="stat"><div class="stat-icon">'+icon('checklist')+'</div><div><strong>'+num(done)+'</strong><small>Objectifs marqués acquis</small></div></div></div>'+
 '<section><div class="section-heading"><div><h2>Ton parcours du jour</h2><p>Trois façons de faire avancer tes révisions.</p></div><a class="text-btn" href="#planning">Mon planning '+icon('arrow')+'</a></div><div class="mission-list">'+
 '<a class="mission" href="#item/'+rec.numero+'"><div class="mission-symbol">'+icon('book')+'</div><div class="mission-copy"><h3>'+esc(rec.titre)+'</h3><p>Item '+rec.numero+' · '+esc(rec.matiere)+'</p></div><span class="tag coral">'+(state.lastItem?'Reprendre':'Explorer')+'</span><span class="chevron">'+icon('chevron')+'</span></a>'+
 '<a class="mission" href="#review"><div class="mission-symbol">'+icon('cards')+'</div><div class="mission-copy"><h3>Entretenir ce que tu sais déjà</h3><p>'+dueCount()+' carte'+(dueCount()>1?'s':'')+' à revoir · Répétition espacée</p></div><span class="tag blue">Rappel actif</span><span class="chevron">'+icon('chevron')+'</span></a>'+
 '<a class="mission" href="#images"><div class="mission-symbol">'+icon('search')+'</div><div class="mission-copy"><h3>Entraîner ton regard clinique</h3><p>'+(window.ATLAS_IMAGE_FLASHCARDS?.stats.cards||0)+' cartes images · Objectifs multimédia et dermatologie</p></div><span class="tag blue">Iconographies</span><span class="chevron">'+icon('chevron')+'</span></a>'+
 '<a class="mission" href="#errors"><div class="mission-symbol">'+icon('target')+'</div><div class="mission-copy"><h3>Faire de tes erreurs un point fort</h3><p>'+state.errors.filter(e=>!e.resolved).length+' notion(s) à consolider dans ton carnet</p></div><span class="tag">Consolider</span><span class="chevron">'+icon('chevron')+'</span></a></div></section>'+
 '<section class="explore"><div class="section-heading"><h2>Explorer une spécialité</h2><a href="#catalog" class="text-btn">Toutes les fiches '+icon('arrow')+'</a></div><div class="specialties">'+special.map(([s,i,t,c])=>'<button class="specialty" data-action="subject" data-subject="'+s+'" style="--tint:'+t+';--accent:'+c+'"><span class="specialty-icon">'+icon(i)+'</span><span><strong>'+s+'</strong><small>'+catalog.filter(x=>normalize(x.matiere).includes(normalize(s))).length+' items</small></span></button>').join('')+'</div></section></div>'+
 '<aside class="right-rail"><section class="panel"><div class="panel-title"><h3>Ta progression</h3><span class="tag coral">'+icon('bolt')+'</span></div><div class="xp-medallion" style="--xp:'+(state.xp%250/250*100)+'%"><div class="xp-inner"><small>Niveau</small><span class="level">'+level+'</span></div></div><div class="level-caption"><strong>'+['Prendre son élan','Trouver son rythme','Créer des réflexes','Gagner en assurance'][Math.min(level-1,3)]+'</strong><p>Chaque session compte.</p></div><div class="progress-label"><span>'+num(state.xp)+' XP</span><span>Prochain niveau : '+num(level*250)+'</span></div><div class="progress-track"><span style="width:'+(state.xp%250/250*100)+'%"></span></div></section>'+
 '<section class="panel"><div class="panel-title"><h3>Garder le rythme</h3>'+icon('flame')+'</div><p>Une semaine, à ton rythme.</p><div class="week">'+days.map((d,i)=>'<div class="week-day '+(d===today()?'today ':'')+(state.activity[d]&&(state.activity[d].cards+state.activity[d].objectives+state.activity[d].focus)>0?'done':'')+'">'+['L','M','M','J','V','S','D'][i]+'<span>'+new Date(d+'T12:00').getDate()+'</span></div>').join('')+'</div><div class="streak-note">'+icon('leaf')+'Même une courte session est un progrès.</div></section>'+
 '<section class="panel quote-panel"><span class="little-label">Le bon réflexe</span><blockquote>Essaie de retrouver la réponse avant de la relire.</blockquote><small>Ton prochain déclic commence ici.</small><a class="text-btn" href="#focus" style="margin-top:15px">Entrer en mode focus '+icon('arrow')+'</a></section></aside></div>'+footer());
}
function catalogPage(){
 shell(intro('Tes fiches, ton terrain de jeu.','Retrouve les '+num(meta.items)+' items de ton ATLAS et construis tes réflexes.')+
 '<div class="toolbar"><label class="search-field">'+icon('search')+'<input id="catalog-query" placeholder="Un item, un numéro, une spécialité…" value="'+esc(filter.query)+'" aria-label="Rechercher dans les fiches"></label><select id="catalog-subject" class="control" aria-label="Filtrer par spécialité">'+options(filter.subject)+'</select></div><div class="filter-chips">'+[['all','Tous les items'],['favorites','Mes favoris'],['started','En cours'],['ready','Avec contenu']].map(([k,l])=>'<button class="chip '+(filter.status===k?'active':'')+'" data-action="catalog-filter" data-filter="'+k+'">'+l+'</button>').join('')+'</div><div id="catalog-results"></div>'+footer());renderCatalog();
}
function filteredCatalog(){return catalog.filter(c=>{
 const q=normalize(filter.query),match=!q||normalize(c.titre+' '+c.numero+' '+c.matiere).includes(q);
 return match&&(!filter.subject||c.matiere===filter.subject)&&(filter.status!=='favorites'||state.favorites.includes(c.numero))&&(filter.status!=='started'||masteredCount(c.numero)>0)&&(filter.status!=='ready'||c.available);
})}
function renderCatalog(){
 const list=filteredCatalog();
 $('#catalog-results').innerHTML='<div class="section-heading"><span class="muted" style="font-size:12px">'+list.length+' item'+(list.length>1?'s':'')+'</span></div>'+(list.length?'<div class="catalog-grid">'+list.slice(0,filter.limit).map(c=>{
 const count=masteredCount(c.numero);
 return '<article class="item-card"><div class="card-top"><span class="item-number">Item '+String(c.numero).padStart(3,'0')+'</span><button class="fav '+(state.favorites.includes(c.numero)?'active':'')+'" data-action="favorite" data-item="'+c.numero+'" aria-label="'+(state.favorites.includes(c.numero)?'Retirer des favoris':'Ajouter aux favoris')+'" aria-pressed="'+state.favorites.includes(c.numero)+'">'+icon('star')+'</button></div><a href="#item/'+c.numero+'"><h3>'+esc(c.titre)+'</h3></a><span class="item-subject">'+esc(c.matiere)+'</span><div class="card-bottom"><span class="tag '+(!c.available?'coral':'')+'">'+(c.available?(count?count+' / ':'')+c.objectifs+' objectifs':'À compléter')+'</span><a class="text-btn" href="#item/'+c.numero+'">Ouvrir '+icon('arrow')+'</a></div></article>';
 }).join('')+'</div>'+(list.length>filter.limit?'<div class="load-more">'+btn('Afficher plus d’items','more','secondary')+'</div>':''):empty('Aucun item trouvé','Essaie un autre mot-clé ou enlève un filtre.','book',btn('Réinitialiser les filtres','reset-filter','secondary')));
}
function empty(title,desc,i='book',actions=''){return '<div class="empty">'+icon(i)+'<h3>'+title+'</h3><p>'+desc+'</p>'+actions+'</div>'}
async function itemPage(n,objectiveId){
 const epoch=++routeEpoch;view='item';objectiveFilter='all';shell(intro('Chargement de la fiche…','Ton contenu arrive.'));
 try{const item=await loadItem(n);if(epoch!==routeEpoch)return;currentItem=item;state.lastItem=n;save();renderItem();if(objectiveId){const target=[...document.querySelectorAll('[data-objective-id]')].find(e=>e.dataset.objectiveId===objectiveId);if(target){target.open=true;window.ATLAS_ILLUSTRATIONS?.hydrate(target);target.scrollIntoView({block:'start'})}}}catch(e){if(epoch===routeEpoch)shell(empty('Fiche indisponible',esc(e.message),'error','<a class="btn secondary" href="#catalog">Retour aux fiches</a>'))}
}
function renderItem(){
 const item=currentItem,c=catalog.find(c=>c.numero===item.numero),count=masteredCount(item.numero);
 const groups=[...new Set(item.objectifs.map(o=>o.rubrique))];
 const tabs=[['objectifs','Objectifs EDN'],['astuces','Astuces & pièges'],['errors','Mes erreurs'],['notes','Mes notes']];
 if(window.ATLAS_ALGORITHMS?.forItem(item.numero).length)tabs.splice(1,0,['algorithmes','Algorithmes']);
 let body='';
 if(tab==='algorithmes')body=window.ATLAS_ALGORITHMS?.render(item.numero)||empty('Aucun parcours disponible','Les parcours sont ajoutés progressivement selon les situations de départ.');
 else if(tab==='objectifs')body=(window.ATLAS_ALGORITHMS?.teaser(item.numero)||'')+objectiveFilterBar(item)+'<div class="reading-layout"><div>'+(!item.objectifs.length?empty('Cette fiche reste à compléter','Le projet source ne contient pas encore d’objectifs pour cet item.'):groups.map((g,gi)=>'<section class="reading-section" id="rubrique-'+gi+'"><h2>'+esc(g)+'</h2>'+item.objectifs.filter(o=>o.rubrique===g).map(o=>'<details class="objective '+(state.mastered[o.id]?'done':'')+'" data-objective-id="'+esc(o.id)+'"><summary><span class="rank '+(o.rang==='B'?'b':'')+'">'+esc(o.rang)+'</span><span>'+esc(o.titre)+'</span>'+(window.ATLAS_ILLUSTRATIONS?.objectiveBadge(o.id)||'')+objectiveFavoriteButton(o.id)+icon('down')+'</summary><div class="objective-body"><div class="medical">'+sanitize(o.contenu,!!window.ATLAS_ILLUSTRATIONS?.countObjective(o.id))+'</div>'+(window.ATLAS_ILLUSTRATIONS?.objectiveImages(o)||'')+'<div class="objective-tools">'+(window.ATLAS_IMAGE_FLASHCARDS?.countObjective(o.id)?'<a class="btn small secondary" href="#images/'+esc(o.id)+'">'+icon('cards')+'Réviser les images ('+window.ATLAS_IMAGE_FLASHCARDS.countObjective(o.id)+')</a>':'')+btn(icon(state.mastered[o.id]?'check':'plus')+(state.mastered[o.id]?'Acquis':'Marquer acquis'),'master','small '+(state.mastered[o.id]?'soft':'secondary'),'data-obj="'+esc(o.id)+'"')+btn(icon('error')+'Noter une erreur','new-error','small secondary','data-obj="'+esc(o.id)+'" data-item="'+item.numero+'"')+'</div></div></details>').join('')+'</section>').join(''))+'</div><aside class="reading-aside panel"><h3>Dans cette fiche</h3>'+groups.map((g,i)=>'<a href="#rubrique-'+i+'" data-action="scroll-rubrique" data-rubrique="'+i+'">'+esc(g)+'</a>').join('')+'<div class="progress-label"><span>Objectifs acquis</span><span>'+count+'/'+item.objectifs.length+'</span></div><div class="progress-track"><span style="width:'+(item.objectifs.length?count/item.objectifs.length*100:0)+'%"></span></div><p class="source-note">'+(item.courseEdition?'Fiche relue'+(item.courseEdition.reviewedAt?' le '+esc(new Date(item.courseEdition.reviewedAt+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})):'')+' à partir de tes cours Notion et des références indiquées sous chaque objectif.':'Contenu repris de ton projet Lovable. Les corrections médicales n’ont pas été réévaluées lors de cet import.')+'</p></aside></div>';
 else if(tab==='astuces')body=(item.astuces?.length?item.astuces.map(a=>'<section class="panel" style="margin-bottom:15px"><h3>'+esc(a.titre)+'</h3><div class="medical" style="margin-top:15px">'+sanitize(a.contenu)+'</div></section>').join(''):empty('Tes astuces viendront ici','Aucune astuce n’était enregistrée pour cet item.'))+(item.strategie?'<section class="panel"><h2>Conduite à tenir</h2>'+Object.entries(item.strategie).filter(([,v])=>v).map(([k,v])=>'<h3 style="margin-top:20px">'+esc({urgence:'Urgences',hospit:'Hospitalisation',redflags:'Signaux d’alerte',principes:'Principes',suivi:'Suivi'}[k]||k)+'</h3><div class="medical">'+sanitize(v)+'</div>').join('')+'</section>':'');
 else if(tab==='errors')body=errorList(item.numero);
 else body='<section class="panel"><h2>Tes repères personnels</h2><p style="margin:10px 0 20px">Une association d’idées, un moyen mnémotechnique, une question pour plus tard.</p><textarea id="item-note" class="notes-area" aria-label="Notes personnelles" placeholder="Écris tes notes pour cet item…">'+esc(state.notes[item.numero]||'')+'</textarea><div class="row" style="margin-top:15px">'+btn('Enregistrer mes notes','save-note')+'<span class="muted" style="font-size:11px" data-sync-label>'+syncLabels[account?.info().status||'guest']+'</span></div></section>';
 shell('<a class="back-link" href="#catalog">'+icon('arrow')+'Toutes les fiches</a><div class="reading-header"><div class="reading-meta"><span class="tag">Item '+item.numero+'</span><span class="tag blue">'+esc(c?.matiere||'EDN')+'</span><span class="muted" style="font-size:11px">'+item.objectifs.length+' objectifs · '+(item.cards?.length||0)+' cartes'+(window.ATLAS_ILLUSTRATIONS?.countItem(item.numero)?' · '+window.ATLAS_ILLUSTRATIONS.countItem(item.numero)+' images intégrées':'')+'</span></div><h1>'+esc(item.titre)+'</h1><div class="reading-actions">'+btn(icon('cards')+'Réviser cet item','review-item','', 'data-item="'+item.numero+'" '+(!item.cards?.length?'disabled':''))+btn(icon('star')+(state.favorites.includes(item.numero)?'Dans mes favoris':'Ajouter aux favoris'),'favorite','secondary','data-item="'+item.numero+'"')+'</div></div>'+colorLegend(item)+'<div class="tabs" role="tablist">'+tabs.map(([k,l])=>'<button role="tab" aria-selected="'+(tab===k)+'" class="tab '+(tab===k?'active':'')+'" data-action="item-tab" data-tab="'+k+'">'+l+'</button>').join('')+'</div>'+body+footer());
 window.ATLAS_ILLUSTRATIONS?.hydrate(document);
 window.ATLAS_ALGORITHM_TREE?.hydrate(document);
 if(tab==='objectifs')applyObjectiveFilter();
}

function cleanObjectiveFavoriteIds(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(id=>typeof id==='string'&&/^\d+-\d+$/.test(id)&&catalog.some(c=>c.numero===Number(id.split('-')[0]))))].slice(0,meta.objectifs||5000);
}
function objectiveFavoriteButton(id){
 const active=state.objectiveFavorites.includes(id),label=(active?'Retirer cet objectif des favoris':'Ajouter cet objectif aux favoris');
 return '<button type="button" class="objective-favorite '+(active?'active':'')+'" data-action="objective-favorite" data-obj="'+esc(id)+'" aria-label="'+label+'" title="'+label+'" aria-pressed="'+active+'">'+icon('star')+'</button>';
}
function objectiveFilterBar(item){
 return '<div class="objective-filterbar"><div role="group" aria-label="Afficher les objectifs"><button type="button" class="chip" data-action="objective-filter" data-filter="all">Tous les objectifs</button><button type="button" class="chip" data-action="objective-filter" data-filter="favorites">'+icon('star')+'Favoris <span id="item-objective-favorite-count">0</span></button></div><a class="text-btn" href="#objective-favorites">Tous mes objectifs favoris '+icon('arrow')+'</a></div><div id="objective-filter-empty" hidden>'+empty('Aucun objectif favori dans cette fiche','Ajoute une étoile sur les objectifs que tu veux retrouver facilement.','star',btn('Afficher tous les objectifs','objective-filter','secondary','data-filter="all"'))+'</div>';
}
function applyObjectiveFilter(){
 if(view!=='item'||tab!=='objectifs')return;
 const ids=new Set(state.objectiveFavorites),details=[...document.querySelectorAll('.objective[data-objective-id]')];
 details.forEach(el=>{el.hidden=objectiveFilter==='favorites'&&!ids.has(el.dataset.objectiveId)});
 for(const section of document.querySelectorAll('.reading-section')){
  section.hidden=![...section.querySelectorAll('.objective')].some(el=>!el.hidden);
  const link=document.querySelector('.reading-aside [data-rubrique="'+section.id.replace('rubrique-','')+'"]');if(link)link.hidden=section.hidden;
 }
 for(const b of document.querySelectorAll('.objective-filterbar [data-action="objective-filter"]')){const active=b.dataset.filter===objectiveFilter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}
 const count=$('#item-objective-favorite-count');if(count)count.textContent=currentItem.objectifs.filter(o=>ids.has(o.id)).length;
 const emptyState=$('#objective-filter-empty');if(emptyState)emptyState.hidden=objectiveFilter!=='favorites'||details.some(el=>!el.hidden);
}
function toggleObjectiveFavorite(button){
 const id=button.dataset.obj;
 if(!/^\d+-\d+$/.test(id)||!window.ATLAS_ITEMS?.[Number(id.split('-')[0])]?.objectifs.some(o=>o.id===id))return;
 const active=state.objectiveFavorites.includes(id);
 state.objectiveFavorites=active?state.objectiveFavorites.filter(x=>x!==id):[...state.objectiveFavorites,id];save();
 for(const b of document.querySelectorAll('[data-action="objective-favorite"]'))if(b.dataset.obj===id){
  const label=active?'Ajouter cet objectif aux favoris':'Retirer cet objectif des favoris';b.classList.toggle('active',!active);b.setAttribute('aria-pressed',String(!active));b.setAttribute('aria-label',label);b.title=label;
 }
 for(const count of document.querySelectorAll('[data-objective-favorite-count]')){count.textContent=state.objectiveFavorites.length;count.hidden=!state.objectiveFavorites.length}
 if(view==='item'){applyObjectiveFilter();if(button.closest('.objective')?.hidden)$('.objective-filterbar [data-filter="favorites"]')?.focus({preventScroll:true})}
 if(view==='objective-favorites'){renderObjectiveFavoriteResults();$('#objective-favorites-query')?.focus({preventScroll:true})}
 toast(active?'Objectif retiré des favoris.':'Objectif ajouté aux favoris.');
}
async function objectiveFavoritesPage(){
 const epoch=++routeEpoch;
 shell(intro('Mes objectifs favoris','Ton ordre de révision, toutes spécialités confondues.')+'<p role="status">Chargement de tes objectifs…</p>');
 const results=await Promise.allSettled([...new Set(state.objectiveFavorites.map(id=>Number(id.split('-')[0])))].map(loadItem));
 if(epoch!==routeEpoch||view!=='objective-favorites')return;
 favoriteLoadFailed=results.some(r=>r.status==='rejected');
 // Keep the personal order saved in the profile, including imported revision priorities.
 const ids=new Set(state.objectiveFavorites),favoriteOrder=new Map(state.objectiveFavorites.map((id,index)=>[id,index]));
 favoriteRows=results.filter(r=>r.status==='fulfilled').flatMap(({value:item})=>item.objectifs.filter(o=>ids.has(o.id)).map(o=>({o,item:catalog.find(c=>c.numero===item.numero)}))).sort((a,b)=>favoriteOrder.get(a.o.id)-favoriteOrder.get(b.o.id));
 shell(intro('Mes objectifs favoris','Ton ordre de révision, toutes spécialités confondues.')+
 '<div class="toolbar"><label class="search-field">'+icon('search')+'<input id="objective-favorites-query" placeholder="Objectif, item, mot-clé…" value="'+esc(objectiveFavoriteFilter.query)+'" aria-label="Rechercher dans mes objectifs favoris"></label><select id="objective-favorites-subject" class="control" aria-label="Filtrer les objectifs favoris par spécialité">'+options(objectiveFavoriteFilter.subject)+'</select></div><div class="objective-favorites-actions"><p id="objective-favorites-result-count" aria-live="polite"></p>'+btn(icon('cards')+'Réviser mes objectifs favoris','review-objective-favorites','secondary small','id="review-objective-favorites"')+'</div>'+
 (favoriteLoadFailed?'<div class="notice">Certaines fiches n’ont pas pu être chargées. Tes favoris sont conservés. '+btn('Réessayer','objective-favorites-retry','secondary small')+'</div>':'')+'<div id="objective-favorites-results"></div>'+footer());
 renderObjectiveFavoriteResults();
}
function renderObjectiveFavoriteResults(){
 const target=$('#objective-favorites-results');if(!target)return;
 const ids=new Set(state.objectiveFavorites),all=favoriteRows.filter(({o})=>ids.has(o.id)),query=normalize(objectiveFavoriteFilter.query).trim();
 const rows=all.filter(({o,item})=>(!objectiveFavoriteFilter.subject||item.matiere===objectiveFavoriteFilter.subject)&&(!query||normalize(o.titre+' '+o.id+' '+item.titre+' '+item.matiere+' '+o.rubrique).includes(query)));
 $('#objective-favorites-result-count').textContent=rows.length+' objectif'+(rows.length>1?'s':'')+' affiché'+(rows.length>1?'s':'')+' sur '+state.objectiveFavorites.length+' favori'+(state.objectiveFavorites.length>1?'s':'');
 const review=$('#review-objective-favorites');if(review)review.disabled=!cardIndex.some(c=>ids.has(c.o));
 if(!rows.length){target.innerHTML=!state.objectiveFavorites.length?empty('Tes objectifs favoris, ici','Dans une fiche, clique sur l’étoile à droite du titre d’un objectif.','star','<a class="btn secondary" href="#catalog">Parcourir mes fiches</a>'):favoriteLoadFailed&&!all.length?empty('Les fiches sont encore indisponibles','Réessaie de charger tes favoris.','book',btn('Réessayer','objective-favorites-retry','secondary')):empty('Aucun objectif avec ces filtres','Essaie un autre mot-clé ou une autre spécialité.','search',btn('Réinitialiser les filtres','objective-favorites-reset','secondary'));return}
 target.innerHTML='<div class="objective-favorites-list">'+rows.map(({o,item})=>'<article class="objective-favorite-row"><div><div class="reading-meta"><span class="tag">Item '+item.numero+'</span><span class="tag">Rang '+esc(o.rang)+'</span><span class="muted">'+esc(item.matiere)+'</span></div><h2><a href="#item/'+item.numero+'/'+esc(o.id)+'">'+esc(o.titre)+'</a></h2><p>'+esc(o.rubrique)+' · '+esc(o.id)+(state.mastered[o.id]?' · Acquis':'')+'</p><div class="objective-favorite-links"><a class="text-btn" href="#item/'+item.numero+'/'+esc(o.id)+'">Lire cet objectif '+icon('arrow')+'</a>'+(window.ATLAS_IMAGE_FLASHCARDS?.countObjective(o.id)?'<a class="text-btn" href="#images/'+esc(o.id)+'">'+icon('cards')+'Réviser les images</a>':'')+'</div></div>'+objectiveFavoriteButton(o.id)+'</article>').join('')+'</div>';
}

function reviewPage(){
 if(session){renderSession();return}
 shell(intro('Un peu de rappel. Beaucoup de progrès.','Choisis ton rythme. Réponds de mémoire, puis évalue ta réponse.')+
 '<div class="session-config"><div class="mode-cards">'+[
 ['mix','bolt','Session découverte','De nouvelles cartes pour te mettre en route.'],
 ['due','clock','À revoir','Les cartes dont la prochaine révision est arrivée.'],
 ['favorites','star','Items favoris','Les cartes des items que tu as mis de côté.'],
 ['objective-favorites','star','Objectifs favoris','Uniquement les cartes liées à tes objectifs favoris.']
 ].map(([k,i,t,d])=>'<button class="mode-card '+(mode===k?'active':'')+'" data-action="review-mode" data-mode="'+k+'">'+icon(i)+'<h3>'+t+'</h3><p>'+d+'</p></button>').join('')+'</div><div class="session-start"><div class="section-heading"><h2>Préparer ma session</h2><span class="tag">'+num(meta.cards)+' cartes importées</span></div><div class="field"><label for="review-subject">Spécialité</label><select id="review-subject">'+options(filter.subject)+'</select></div><div class="field"><label for="review-length">Nombre de cartes</label><select id="review-length"><option value="10">10 cartes · petite session</option><option value="20">20 cartes · objectif quotidien</option><option value="40">40 cartes · session approfondie</option></select></div><div class="row" style="margin-top:25px">'+btn('C’est parti '+icon('play'),'start-session')+'<span class="muted" style="font-size:11px">'+dueCount()+' carte(s) à revoir aujourd’hui</span></div><p class="source-note">Cartes reprises du projet existant, avec son moteur de répétition espacée. Ta progression commence ici.</p></div></div>'+footer());
}
async function startSession({item=null,length=10,subject='',sessionMode='mix'}={}){
 const epoch=++routeEpoch;
 let candidates=cardIndex.filter(c=>(!item||c.n===item)&&(!subject||catalog.find(i=>i.numero===c.n)?.matiere===subject));
 if(sessionMode==='due')candidates=candidates.filter(c=>state.srs[c.i]?.due<=today()).sort((a,b)=>state.srs[a.i].due.localeCompare(state.srs[b.i].due));
 else if(sessionMode==='favorites')candidates=candidates.filter(c=>state.favorites.includes(c.n));
 else if(sessionMode==='objective-favorites')candidates=candidates.filter(c=>state.objectiveFavorites.includes(c.o));
 else candidates=candidates.filter(c=>!state.srs[c.i]||state.srs[c.i].due<=today());
 if(!candidates.length){toast(sessionMode==='objective-favorites'?'Aucune carte texte pour ces objectifs favoris avec les critères choisis.':sessionMode==='favorites'?'Ajoute d’abord un item avec des cartes à tes favoris.':sessionMode==='due'?'Toutes tes révisions sont à jour. Choisis une session découverte.':'Aucune nouvelle carte disponible avec ces critères.');return}
 if(sessionMode!=='due')for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 candidates=candidates.slice(0,length);
 view='review';shell(intro('Ta session se prépare…','Chargement de '+candidates.length+' cartes de ton ATLAS.'));
 try{
  const items=await Promise.all([...new Set(candidates.map(c=>c.n))].map(loadItem));
  if(epoch!==routeEpoch)return;
  const all=items.flatMap(i=>i.cards||[]),cards=candidates.map(c=>all.find(x=>x.i===c.i)).filter(Boolean);
  if(!cards.length)throw Error('Les cartes n’ont pas pu être chargées.');
  session={cards,index:0,revealed:false,grades:[],xp:0,done:false,started:Date.now()};
  history.replaceState(null,'','#review');view='review';renderSession();
 }catch(e){if(epoch!==routeEpoch)return;session=null;reviewPage();toast(e.message)}
}
function renderSession(){
 if(!session)return reviewPage();
 if(session.index>=session.cards.length){
  session.done=true;const good=session.grades.filter(g=>g>=2).length;
  shell('<div class="session"><div class="session-complete"><div class="success-emblem">'+icon('check')+'</div><h1>Un pas de plus, '+esc(state.name)+'.</h1><p>'+session.cards.length+' cartes revues. '+good+' réponse(s) évaluée(s) correcte(s).<br>Tes prochaines révisions sont programmées.</p><div class="reward">'+icon('bolt')+' +'+session.xp+' XP</div><div class="row" style="justify-content:center">'+btn('Retour à mon espace','finish-session')+btn('Nouvelle session','another-session','secondary')+'</div><p class="source-note">Une pause est aussi une bonne idée.</p></div></div>');return
 }
 const c=session.cards[session.index],item=catalog.find(x=>x.numero===c.n),scheduler=window.ATLAS_SRS;
 const prev=state.srs[c.i]||scheduler.INITIAL_STATE;
 shell('<div class="session"><div class="page-intro"><div><h1>À toi de retrouver.</h1><p>Prends quelques secondes pour formuler ta réponse.</p></div>'+btn('Terminer','end-session','secondary small')+'</div><div class="session-progress"><span>Carte '+(session.index+1)+' sur '+session.cards.length+'</span><div class="progress-track"><span style="width:'+(session.index/session.cards.length*100)+'%"></span></div><span>'+session.xp+' XP</span></div><article class="flashcard"><div class="reading-meta"><span class="tag">Item '+c.n+'</span><span class="tag blue">'+esc(item?.matiere||'EDN')+'</span></div><h2 class="flash-title">'+esc(c.q)+'</h2>'+(session.revealed?'<div class="response medical">'+sanitize(c.a)+'</div><p class="source-note">Source : ATLAS-EDN · Objectif '+esc(c.o)+' · '+esc(c.u)+'</p>':btn('Révéler la réponse','reveal','reveal-button')+'<p class="small-hint">Raccourci : espace</p>')+'</article>'+
 (session.revealed?'<div class="ratings">'+['À revoir','Difficile','Bien','Facile'].map((l,i)=>'<button class="rate" data-action="grade" data-grade="'+i+'">'+l+'<small>'+scheduler.intervalLabel(scheduler.schedule(prev,i).intervalDays)+' · touche '+(i+1)+'</small></button>').join('')+'</div><div class="row" style="justify-content:center;margin-top:20px"><button class="text-btn" data-action="new-error" data-item="'+c.n+'" data-obj="'+esc(c.o)+'">'+icon('error')+'Garder une trace dans mon carnet</button></div>':'')+'</div>');
}
function grade(g){
 if(!session||!session.revealed||session.done)return;
 const c=session.cards[session.index],next=window.ATLAS_SRS.schedule(state.srs[c.i]||window.ATLAS_SRS.INITIAL_STATE,g);
 state.srs[c.i]={...next,due:addDays(today(),next.intervalDays),item:c.n,last:today(),lastGrade:g};
 const xp=g>=2?10:5;state.xp+=xp;session.xp+=xp;session.grades.push(g);session.index++;session.revealed=false;track('cards');renderSession();
}
function errorList(item=null){
 const errors=state.errors.filter(e=>!item||e.item===item);
 return '<div class="section-heading"><div><h2>'+errors.filter(e=>!e.resolved).length+' notion(s) à consolider</h2><p>Ta propre expérience, transformée en repères.</p></div>'+btn(icon('plus')+'Ajouter','new-error','secondary small',item?'data-item="'+item+'"':'')+'</div>'+
 (errors.length?errors.slice().reverse().map(e=>'<article class="error-entry '+(e.resolved?'resolved':'')+'"><div class="row"><span class="tag '+(e.resolved?'':'coral')+'">'+(e.item?'Item '+e.item:'Note personnelle')+'</span><span class="muted" style="font-size:10px">'+esc(e.date)+'</span><span class="spacer"></span><button class="icon-btn" data-action="resolve-error" data-id="'+esc(e.id)+'" aria-label="'+(e.resolved?'Rouvrir cette erreur':'Marquer cette erreur résolue')+'">'+icon(e.resolved?'reset':'check')+'</button><button class="icon-btn" data-action="delete-error" data-id="'+esc(e.id)+'" aria-label="Supprimer cette erreur">'+icon('trash')+'</button></div><h3>'+esc(e.title)+'</h3><p>'+esc(e.correction)+'</p>'+(e.item?'<a class="text-btn" style="margin-top:10px" href="#item/'+e.item+'">Relire la fiche '+icon('arrow')+'</a>':'')+'</article>').join(''):
 empty('Ton carnet commence ici.','Note une confusion, le raisonnement qui t’a piégé et le repère à garder.','error',btn('Ajouter ma première erreur','new-error','secondary',item?'data-item="'+item+'"':'')));
}
function errorsPage(){shell(intro('Tes erreurs ont quelque chose à t’apprendre.','Un endroit pour comprendre ce qui t’a échappé et mieux le retrouver.')+errorList()+footer())}
let previousFocus=null;
function modal(title,content){
 closeNavigation();
 previousFocus=document.activeElement;
 $('#overlay').innerHTML='<div class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">'+title+'</h2><button class="icon-btn" data-action="close-modal" aria-label="Fermer">'+icon('close')+'</button></div>'+content+'</section></div>';
 setTimeout(()=>$('.modal input,.modal select,.modal textarea,.modal button')?.focus(),30);
}
function closeModal(){$('#overlay').innerHTML='';previousFocus?.focus()}
function newError(item,objective){
 let c=session&&!session.done?session.cards[session.index]:null;
 const title=c&&c.n===item?c.q:'';
 modal('Garder le bon repère','<form id="error-form"><div class="field"><label for="error-item">Item associé (facultatif)</label><input id="error-item" type="number" min="1" max="367" value="'+(item||'')+'"></div><div class="field"><label for="error-title">Ce qui m’a piégé</label><input id="error-title" required maxlength="300" value="'+esc(title)+'" placeholder="Une confusion, une étape oubliée…"></div><div class="field"><label for="error-correction">Le repère à garder</label><textarea id="error-correction" required maxlength="5000" placeholder="Pourquoi je me suis trompé et ce que je retiens."></textarea></div><input type="hidden" id="error-objective" value="'+esc(objective||'')+'"><div class="modal-actions"><button type="button" class="btn secondary" data-action="close-modal">Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form>');
}
function planningPage(){
 const start=addDays(today(),-((new Date().getDay()+6)%7)+weekOffset*7);
 const days=Array.from({length:7},(_,i)=>addDays(start,i));
 shell(intro('Un cap clair pour ta semaine.','Un planning simple, que tu ajustes à ton énergie.',btn(icon('plus')+'Planifier','new-plan','', 'data-date="'+today()+'"'))+
 '<div class="row"><button class="icon-btn" data-action="week-prev" aria-label="Semaine précédente" style="transform:rotate(180deg)">'+icon('chevron')+'</button><h3>'+new Date(start+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' — '+new Date(days[6]+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+'</h3><button class="icon-btn" data-action="week-next" aria-label="Semaine suivante">'+icon('chevron')+'</button><button class="text-btn" data-action="week-today">Cette semaine</button></div>'+
 '<div class="plans">'+days.map(d=>'<section class="plan-day '+(d===today()?'today':'')+'"><h3>'+new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'short'})+'<span>'+new Date(d+'T12:00').getDate()+'</span></h3>'+state.plans.filter(p=>p.date===d).map(p=>'<div class="plan-entry '+(p.done?'done':'')+'"><strong>'+esc(p.title)+'</strong><small>'+p.minutes+' min'+(p.item?' · Item '+p.item:'')+'</small><div class="row"><button data-action="toggle-plan" data-id="'+p.id+'">'+(p.done?'Rouvrir':'Terminé')+'</button><span class="spacer"></span><button data-action="delete-plan" data-id="'+p.id+'" aria-label="Retirer cette session">×</button></div>'+(p.item?'<a class="text-btn" href="#item/'+p.item+'">Ouvrir</a>':'')+'</div>').join('')+'<button class="add-plan" data-action="new-plan" data-date="'+d+'">+ Ajouter</button></section>').join('')+'</div><div class="notice" style="margin-top:22px">Ton planning suit le mode de sauvegarde indiqué ci-dessous. Tu peux exporter ton planning au format calendrier depuis les préférences.</div>'+footer());
}
function newPlan(date){
 modal('Préparer une session','<form id="plan-form"><div class="field"><label for="plan-title">Ce que je prévois</label><input id="plan-title" required maxlength="200" placeholder="Réviser les urgences cardiologiques"></div><div class="row"><div class="field" style="flex:1"><label for="plan-date">Date</label><input id="plan-date" required type="date" value="'+date+'"></div><div class="field" style="width:130px"><label for="plan-minutes">Durée (minutes)</label><input id="plan-minutes" required type="number" min="5" max="240" value="25"></div></div><div class="field"><label for="plan-item">Item associé (facultatif)</label><input id="plan-item" type="number" min="1" max="367" placeholder="247"></div><div class="modal-actions"><button class="btn" type="submit">Ajouter au planning</button></div></form>');
}
function statsPage(){
 const total=Object.values(state.activity).reduce((s,a)=>s+(a.cards||0),0),mastered=Object.values(state.mastered).filter(Boolean).length,days=Array.from({length:56},(_,i)=>addDays(today(),i-55));
 const focus=Math.round(state.focusSeconds/60);
 shell(intro('Regarde le chemin parcouru.','Ta progression reflète uniquement le travail enregistré ici.')+
 '<div class="stats-grid"><section class="panel"><h3>Cartes revues</h3><span class="big-number">'+num(total)+'</span><p>'+Object.keys(state.srs).length+' cartes différentes</p></section><section class="panel"><h3>Objectifs acquis</h3><span class="big-number">'+num(mastered)+'</span><p>Sur '+num(meta.objectifs)+' objectifs importés</p></section><section class="panel"><h3>Temps de focus</h3><span class="big-number">'+num(focus)+'<small> min</small></span><p>Sessions terminées</p></section></div>'+
 '<div class="panel"><div class="section-heading"><h2>La régularité se construit</h2><span class="tag">'+streak()+' jour(s) de suite</span></div><p>Les 8 dernières semaines. Une case correspond à un jour.</p><div class="activity-grid">'+days.map(d=>{const a=state.activity[d],n=a?(a.cards||0)+(a.objectives||0)+(a.focus||0):0;return '<div class="activity-cell '+(n>=state.goal?'heavy':n?'on':'')+'" title="'+d+' : '+n+' activité(s)" aria-label="'+d+' : '+n+' activité(s)"></div>'}).join('')+'</div></div>'+
 '<section class="panel" style="margin-top:23px"><h2>Des repères pour avancer</h2><div class="badges">'+[['Premier pas','leaf',total>0],['Un peu chaque jour','flame',streak()>=3],['Cent cartes','cards',total>=100],['Carnet ouvert','edit',state.errors.length>0],['Dans ma bulle','clock',focus>=25]].map(([l,i,yes])=>'<div class="achievement '+(yes?'unlocked':'')+'"><span>'+icon(i)+'</span>'+l+'<small style="display:block;margin-top:5px">'+(yes?'Débloqué':'À découvrir')+'</small></div>').join('')+'</div></section>'+
 '<section class="panel" style="margin-top:23px"><h2>Spécialité par spécialité</h2><p style="margin-top:8px">Part des objectifs que tu as marqués acquis.</p>'+subjects.map(s=>{const cs=catalog.filter(c=>c.matiere===s),den=cs.reduce((a,c)=>a+c.objectifs,0),done=cs.reduce((a,c)=>a+masteredCount(c.numero),0),pct=den?Math.min(100,Math.round(done/den*100)):0;return '<div class="mastery-row"><span>'+esc(s)+'</span><div class="progress-track"><span style="width:'+pct+'%"></span></div><span>'+pct+' %</span></div>'}).join('')+'</section>'+footer());
}
function focusPage(){
 shell(intro('Une chose à la fois.','Choisis une durée, pose ton téléphone et installe-toi.')+
 '<div class="focus-grid"><section class="focus-widget"><div class="timer-mode">'+[15,25,45].map(m=>'<button class="chip '+(timer.duration===m*60?'active':'')+'" data-action="timer-mode" data-minutes="'+m+'">'+m+' min</button>').join('')+'</div><div id="timer-display" class="timer-display">'+timerText()+'</div><div class="row">'+btn(icon(timer.running?'pause':'play')+(timer.running?'Pause':'Commencer'),'timer-toggle')+btn(icon('reset'),'timer-reset','secondary','aria-label="Réinitialiser le minuteur"')+'</div><p class="focus-message">Le minuteur continue lorsque tu parcours tes fiches.<br>Une session terminée ajoute du temps à ta progression.</p></section><section class="panel"><h2>Mon intention</h2><p style="margin:12px 0 20px">Choisis un objectif assez petit pour le terminer pendant cette session.</p><div class="field"><label for="focus-intent">Pendant ce créneau, je vais…</label><textarea id="focus-intent" placeholder="Revoir les critères diagnostiques de l’item 247">'+esc(state.focusIntent||'')+'</textarea></div><a class="btn secondary" href="#catalog">'+icon('book')+'Ouvrir mes fiches</a><div class="notice" style="margin:25px 0 0">À la fin, prends quelques minutes de pause avant de repartir.</div></section></div>'+footer());
}
function timerText(){return String(Math.floor(timer.seconds/60)).padStart(2,'0')+':'+String(timer.seconds%60).padStart(2,'0')}
function timerTick(){
 if(!timer.running)return;
 timer.seconds=Math.max(0,Math.ceil((timer.end-Date.now())/1000));
 if($('#timer-display'))$('#timer-display').textContent=timerText();
 if(timer.seconds===0){clearInterval(timer.handle);timer.running=false;state.focusSeconds+=timer.duration;state.xp+=25;track('focus');if(view==='focus')focusPage();toast('Session terminée ! +25 XP. C’est le moment de faire une pause.')}
}
function timerToggle(){if(timer.running){timerTick();timer.running=false;clearInterval(timer.handle)}else{if(timer.seconds<=0)timer.seconds=timer.duration;timer.running=true;timer.end=Date.now()+timer.seconds*1000;timer.handle=setInterval(timerTick,1000)}focusPage()}
function settings(){
 modal('Ton espace, à ta façon','<form id="settings-form"><div class="row"><div class="field" style="flex:1"><label for="setting-name">Prénom</label><input id="setting-name" required maxlength="30" value="'+esc(state.name)+'"></div><div class="field" style="width:150px"><label for="setting-goal">Cartes par jour</label><input id="setting-goal" type="number" min="5" max="200" value="'+state.goal+'" required></div></div><button class="btn small" type="submit">Enregistrer</button></form><div class="settings-section"><h3>Mes sauvegardes</h3><p>Connecte-toi depuis Mon profil pour sauvegarder tes révisions sur ton compte. En mode invité, elles restent sur cet appareil. Tu peux aussi exporter une copie.</p><div class="row" style="flex-wrap:wrap">'+btn(icon('download')+'Exporter mes données','export','secondary small')+btn(icon('upload')+'Importer une sauvegarde','import','secondary small')+'<input type="file" id="import-file" accept=".json,application/json" hidden></div></div><div class="settings-section"><h3>Mon calendrier</h3>'+btn(icon('calendar')+'Exporter le planning (.ics)','export-calendar','secondary small')+'</div><div class="settings-section"><h3>À propos de cette base</h3><p>'+num(meta.items)+' fiches, '+num(meta.objectifs)+' objectifs et '+num(meta.cards)+' cartes repris d’ATLAS-EDN le 11 octobre 2026. La connexion utilise ton compte ATLAS. L’historique de l’application d’origine, ses modifications de contenu et ses outils IA ne sont pas importés.</p><a class="text-btn" href="https://lovable.dev/projects/c74c877d-33ee-42f3-bd5c-e3ed124227f3" target="_blank" rel="noopener">Ouvrir le projet d’origine '+icon('arrow')+'</a></div>');
}
function download(filename,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportCalendar(){
 if(!state.plans.length){toast('Ajoute d’abord une session à ton planning.');return}
 const clean=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ATLAS-EDN//Planning//FR','CALSCALE:GREGORIAN'];
 state.plans.forEach(p=>lines.push('BEGIN:VEVENT','UID:'+p.id+'@atlas-edn','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z','DTSTART;VALUE=DATE:'+p.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(p.date,1).replace(/-/g,''),'SUMMARY:'+clean(p.title),'DESCRIPTION:'+clean(p.minutes+' minutes'+(p.item?' — Item '+p.item:'')),'END:VEVENT'));
 lines.push('END:VCALENDAR');download('atlas-planning.ics',lines.join('\r\n'),'text/calendar');toast('Planning exporté.');
}
async function importState(file){
 if(!file)return;const importEpoch=routeEpoch;
 try{
  if(file.size>10*1024*1024)throw Error('Le fichier dépasse 10 Mo.');
  const d=JSON.parse(await file.text());
  if(d.version!==1||typeof d.name!=='string'||!Array.isArray(d.favorites)||!Array.isArray(d.errors)||!Array.isArray(d.plans)||typeof d.srs!=='object'||!d.srs||!d.activity||!d.mastered||!d.notes)throw Error('Ce fichier n’est pas une sauvegarde ATLAS valide.');
  const clean=defaults();
  clean.name=d.name.slice(0,30)||'Kevin';clean.goal=Math.max(5,Math.min(200,Number(d.goal)||20));clean.theme=d.theme==='dark'?'dark':'light';clean.sidebarCollapsed=d.sidebarCollapsed===true;clean.readingScale=readingScale(d.readingScale);
  clean.favorites=d.favorites.filter(n=>Number.isInteger(n)&&catalog.some(c=>c.numero===n));
  const favoriteIds=cleanObjectiveFavoriteIds(d.objectiveFavorites);
  const favoriteItems=await Promise.all([...new Set(favoriteIds.map(id=>Number(id.split('-')[0])))].map(loadItem));
  const validObjectives=new Set(favoriteItems.flatMap(item=>item.objectifs.map(o=>o.id)));
  clean.objectiveFavorites=favoriteIds.filter(id=>validObjectives.has(id));
  clean.mastered=Object.fromEntries(Object.entries(d.mastered).filter(([k,v])=>/^\d+-\d+$/.test(k)&&v===true));
  clean.objectiveAwards=Object.fromEntries(Object.entries(d.objectiveAwards||d.mastered).filter(([k,v])=>/^\d+-\d+$/.test(k)&&v===true));
  clean.notes=Object.fromEntries(Object.entries(d.notes).filter(([k,v])=>/^\d+$/.test(k)&&typeof v==='string').map(([k,v])=>[k,v.slice(0,50000)]));
  clean.errors=d.errors.filter(e=>e&&typeof e.title==='string'&&typeof e.correction==='string'&&/^[a-zA-Z0-9-]+$/.test(e.id)).map(e=>({id:e.id,title:e.title.slice(0,300),correction:e.correction.slice(0,5000),date:String(e.date||''),item:catalog.some(c=>c.numero===e.item)?e.item:null,resolved:!!e.resolved}));
  clean.plans=d.plans.filter(p=>p&&typeof p.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&/^[a-zA-Z0-9-]+$/.test(p.id)).map(p=>({...p,title:p.title.slice(0,200),minutes:Math.max(5,Math.min(240,Number(p.minutes)||25)),done:!!p.done,item:catalog.some(c=>c.numero===p.item)?p.item:null}));
  const validIds=new Set(cardIndex.map(c=>c.i));
  clean.srs=Object.fromEntries(Object.entries(d.srs).filter(([k,v])=>validIds.has(k)&&v&&/^\d{4}-\d{2}-\d{2}$/.test(v.due)&&[v.ease,v.intervalDays,v.repetitions,v.lapses].every(Number.isFinite)).map(([k,v])=>[k,{...v,ease:Math.max(1.3,Math.min(2.8,v.ease)),intervalDays:Math.max(1,Math.min(180,v.intervalDays)),repetitions:Math.max(0,v.repetitions),lapses:Math.max(0,v.lapses)}]));
  clean.activity=Object.fromEntries(Object.entries(d.activity).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object').map(([k,v])=>[k,{cards:Math.max(0,Number(v.cards)||0),objectives:Math.max(0,Number(v.objectives)||0),focus:Math.max(0,Number(v.focus)||0)}]));
  clean.imageCards=window.ATLAS_IMAGE_FLASHCARDS?.cleanState(d.imageCards)||null;
  clean.xp=Math.max(0,Number(d.xp)||0);clean.focusSeconds=Math.max(0,Number(d.focusSeconds)||0);clean.lastItem=catalog.some(c=>c.numero===d.lastItem)?d.lastItem:null;
  if(importEpoch!==routeEpoch)return;
  window.ATLAS_PENDING_IMPORT=clean;
  modal('Restaurer cette sauvegarde ?','<p>Elle contient '+clean.errors.length+' erreurs, '+clean.plans.length+' sessions planifiées et '+Object.keys(clean.srs).length+' cartes texte suivies et '+Object.keys(clean.imageCards?.reviews||{}).length+' cartes images évaluées. Ta progression actuelle sera remplacée.</p><div class="modal-actions">'+btn('Annuler','close-modal','secondary')+btn('Restaurer','confirm-import')+'</div>');
 }catch(e){toast(e.message||'Impossible de lire cette sauvegarde.')}
}
function searchModal(){modal('Retrouver un item','<label class="search-field">'+icon('search')+'<input id="global-search" autofocus placeholder="Diabète, 247, cardiologie…" aria-label="Rechercher un item"></label><div id="search-results" class="search-results"></div>');renderSearch('')}
function renderSearch(q){
 const matches=catalog.filter(c=>!q||normalize(c.titre+' '+c.numero+' '+c.matiere).includes(normalize(q))).slice(0,12);
 $('#search-results').innerHTML=matches.length?matches.map(c=>'<a class="search-result" data-action="open-search-item" href="#item/'+c.numero+'"><span>Item '+c.numero+' · '+esc(c.matiere)+'</span>'+esc(c.titre)+'</a>').join(''):'<p style="padding-top:20px">Aucun item trouvé.</p>';
}
function imageCardsPage(objective){window.ATLAS_IMAGE_FLASHCARDS?.mount({state,shell,save,toast,loadItem,sanitize,today,addDays,track},objective)}
let account, accountMode='login', accountBusy=false;
function cleanAccountState(data){
 const d=data&&data.version===1?data:{},clean=defaults();
 clean.name=typeof d.name==='string'?d.name.trim().slice(0,30)||'Étudiant':clean.name;
 clean.goal=Math.max(5,Math.min(200,Number(d.goal)||20));clean.theme=d.theme==='dark'?'dark':'light';clean.sidebarCollapsed=d.sidebarCollapsed===true;clean.readingScale=readingScale(d.readingScale);
 const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 clean.favorites=Array.isArray(d.favorites)?d.favorites.filter(n=>Number.isInteger(n)&&catalog.some(c=>c.numero===n)):[];
 clean.objectiveFavorites=cleanObjectiveFavoriteIds(d.objectiveFavorites);
 for(const field of ['mastered','objectiveAwards'])clean[field]=Object.fromEntries(Object.entries(obj(d[field])).filter(([k,v])=>/^\d+-\d+$/.test(k)&&v===true));
 clean.notes=Object.fromEntries(Object.entries(obj(d.notes)).filter(([k,v])=>/^\d+$/.test(k)&&typeof v==='string').map(([k,v])=>[k,v.slice(0,50000)]));
 clean.errors=(Array.isArray(d.errors)?d.errors:[]).filter(e=>e&&/^[a-zA-Z0-9-]+$/.test(e.id)&&typeof e.title==='string'&&typeof e.correction==='string').map(e=>({...e,title:e.title.slice(0,300),correction:e.correction.slice(0,5000),item:catalog.some(c=>c.numero===e.item)?e.item:null,resolved:!!e.resolved}));
 clean.plans=(Array.isArray(d.plans)?d.plans:[]).filter(p=>p&&/^[a-zA-Z0-9-]+$/.test(p.id)&&typeof p.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)).map(p=>({...p,title:p.title.slice(0,200),minutes:Math.max(5,Math.min(240,Number(p.minutes)||25)),item:catalog.some(c=>c.numero===p.item)?p.item:null,done:!!p.done}));
 const ids=new Set(cardIndex.map(c=>c.i));
 clean.srs=Object.fromEntries(Object.entries(obj(d.srs)).filter(([k,v])=>ids.has(k)&&v&&/^\d{4}-\d{2}-\d{2}$/.test(v.due)&&[v.ease,v.intervalDays,v.repetitions,v.lapses].every(Number.isFinite)));
 clean.activity=Object.fromEntries(Object.entries(obj(d.activity)).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object').map(([k,v])=>[k,{cards:Math.max(0,Number(v.cards)||0),objectives:Math.max(0,Number(v.objectives)||0),focus:Math.max(0,Number(v.focus)||0)}]));
 clean.imageCards=window.ATLAS_IMAGE_FLASHCARDS?.cleanState(d.imageCards)||null;
 clean.xp=Math.max(0,Number(d.xp)||0);clean.focusSeconds=Math.max(0,Number(d.focusSeconds)||0);clean.lastItem=catalog.some(c=>c.numero===d.lastItem)?d.lastItem:null;
 clean.focusIntent=String(d.focusIntent||'').slice(0,5000);return clean;
}
const syncLabels={loading:'Ouverture de ton espace…',guest:'Mode invité · sauvegarde sur cet appareil',disabled:'Connexion indisponible · mode invité',pending:'Modifications en attente de sauvegarde',saving:'Sauvegarde en cours…',synced:'Progression sauvegardée sur ton compte',offline:'Connexion interrompue · sauvegarde à vérifier',conflict:'Deux versions à départager',remote:'Une version plus récente est disponible',unavailable:'Impossible de charger ton profil'};
function accountStatus(info){
 document.querySelectorAll('[data-sync-label]').forEach(el=>el.textContent=syncLabels[info.status]||'');
 document.querySelectorAll('[data-account-notice]').forEach(el=>{
  const problem=['offline','conflict','remote'].includes(info.status);
  el.hidden=!problem;el.textContent=problem?(syncLabels[info.status]+'. Ouvre Mon profil pour continuer.'):'';
 });
 const details=$('#account-sync-details');
 if(details)details.innerHTML=accountSyncDetails(info);
}
function accountSyncDetails(info){
 if(info.conflict)return '<p>Une autre session a enregistré une version différente. Choisis celle à conserver. La version remplacée sera téléchargée en sauvegarde.</p><div class="account-actions">'+btn('Utiliser la version du compte','account-cloud','secondary')+(info.dirty?btn('Garder ma version actuelle','account-local','secondary'):'')+'</div>';
 return '<p>'+(info.lastSync?'Dernière sauvegarde : '+esc(new Date(info.lastSync).toLocaleString('fr-FR'))+'.':'Tes modifications seront sauvegardées dès que la connexion le permettra.')+'</p>'+btn('Vérifier la synchronisation','account-sync','secondary');
}
function accountField(label,id,type,extra=''){return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" name="'+id+'" type="'+type+'" required '+extra+'></div>'}
function accountFeedback(message,error=false){const el=$('#account-feedback');if(el){el.textContent=message;el.classList.toggle('error',error);el.focus()}else toast(message)}
function authError(error){
 const code=error?.code||'',message=String(error?.message||'');
 if(code==='invalid_credentials'||/Invalid login credentials/i.test(message))return 'Adresse e-mail ou mot de passe incorrect.';
 if(/rate_limit|over_email_send|over_request/.test(code)||/rate limit/i.test(message))return 'Trop de tentatives rapprochées. Patiente quelques instants avant de réessayer.';
 if(code==='user_already_exists')return 'Un compte utilise déjà cette adresse. Connecte-toi avec ton mot de passe.';
 if(code==='email_not_confirmed')return 'Confirme ton adresse grâce au message reçu par e-mail, puis reconnecte-toi.';
 if(/password/i.test(code))return 'Le mot de passe ne respecte pas les critères du service, ou il est identique au précédent. Choisis-en un autre.';
 if(/fetch|network|timeout/i.test(message))return 'Connexion au service impossible. Vérifie ta connexion Internet et réessaie.';
 return 'Cette opération n’a pas abouti. Vérifie les informations puis réessaie.';
}
function loginPage(){
 if(account.info().user){location.hash='profile';return}
 const signup=accountMode==='signup';
 shell('<section class="account-layout"><aside class="account-story"><span class="little-label">TON ESPACE ATLAS</span><div class="account-emblem" aria-hidden="true">✳</div><h1>Tes révisions.<br> Ton rythme.<br> Ton parcours.</h1><p>Retrouve tes repères, de ton ordinateur à ton iPad.</p><ul><li>'+icon('star')+'Tes favoris et tes notes</li><li>'+icon('cards')+'Ta progression et tes flashcards</li><li>'+icon('calendar')+'Ton planning personnel</li></ul><span class="account-story-foot">Un peu, chaque jour.</span></aside><div class="account-form-panel"><div class="account-switch" aria-label="Accès au compte"><button data-action="account-mode" data-mode="login" aria-pressed="'+!signup+'">Connexion</button><button data-action="account-mode" data-mode="signup" aria-pressed="'+signup+'">Créer mon compte</button></div><h2>'+(signup?'Un espace rien qu’à toi.':'Ravi de te retrouver.')+'</h2><p class="account-subtitle">'+(signup?'Crée ton profil pour conserver tes révisions.':'Connecte-toi pour reprendre là où tu en étais.')+'</p><form id="account-auth-form" data-mode="'+accountMode+'">'+(signup?accountField('Ton prénom','account-name','text','autocomplete="given-name" maxlength="30" placeholder="Prénom"'):'')+accountField('Adresse e-mail','account-email','email','autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="toi@exemple.fr"')+'<div class="field"><label for="account-password">Mot de passe</label><div class="password-wrap"><input id="account-password" name="password" type="password" required '+(signup?'minlength="10"':'')+' maxlength="128" autocomplete="'+(signup?'new-password':'current-password')+'" aria-describedby="password-hint"><button type="button" data-action="account-show-password" aria-controls="account-password" aria-label="Afficher le mot de passe">Afficher</button></div><small id="password-hint">'+(signup?'Au moins 10 caractères.':'Tu peux utiliser ton compte ATLAS d’origine.')+'</small></div>'+(signup?accountField('Confirmer le mot de passe','account-confirm','password','minlength="10" maxlength="128" autocomplete="new-password"'):'')+'<div id="account-feedback" class="account-feedback" role="status" tabindex="-1"></div><button class="btn account-submit" type="submit">'+(signup?'Créer mon espace':'Me connecter')+icon('arrow')+'</button></form><p class="account-fineprint">Tes données sont rattachées à ton compte. Les révisions déjà présentes sur cet appareil pourront être importées après connexion.</p><a href="#home" class="text-btn account-guest">Continuer en mode invité '+icon('arrow')+'</a></div></section>');
}
function profilePage(){
 const info=account.info();if(!info.user){view='login';loginPage();return}
 const guest=account.guest(),hasGuest=guest&&((guest.favorites?.length||0)+(guest.objectiveFavorites?.length||0)+(guest.errors?.length||0)+(guest.plans?.length||0)+Object.keys(guest.mastered||{}).length+Object.keys(guest.srs||{}).length+Object.keys(guest.notes||{}).length+Object.keys(guest.imageCards?.reviews||{}).length+(guest.xp||0)>0);
 shell(intro('Mon profil','Ton espace personnel, partout où tu révises.')+'<div class="account-profile-grid"><section class="panel account-identity"><div class="account-avatar">'+esc(state.name.slice(0,1).toUpperCase())+'</div><h2>'+esc(state.name)+'</h2><p class="account-email">'+esc(info.user.email)+'</p><span class="pill">Compte personnel</span><div class="account-mini-stats"><div><strong>'+num(Object.keys(state.mastered).length)+'</strong><span>objectifs acquis</span></div><div><strong>'+num(state.favorites.length)+'</strong><span>fiches favorites</span></div></div>'+btn('Me déconnecter','account-signout','secondary')+'</section><div class="account-profile-content"><section class="panel"><h2>À ta façon</h2><p>Les repères qui accompagnent tes journées de révision.</p><form id="account-profile-form"><div class="account-fields">'+accountField('Prénom','profile-name','text','value="'+esc(state.name)+'" maxlength="30" autocomplete="given-name"')+accountField('Cartes par jour','profile-goal','number','value="'+state.goal+'" min="5" max="200"')+'</div><button class="btn" type="submit">Enregistrer mon profil</button></form></section><section class="panel"><h2 class="account-sync-heading">'+icon('lock')+'<span data-sync-label>'+syncLabels[info.status]+'</span></h2><div id="account-sync-details">'+accountSyncDetails(info)+'</div><p class="account-fineprint">Tes notes, favoris, objectifs, flashcards, erreurs et planning sont enregistrés sur ce compte. L’historique de l’application d’origine n’est pas importé automatiquement.</p></section>'+(hasGuest?'<section class="panel"><h2>Retrouver mes révisions sur cet appareil</h2><p>Une progression en mode invité est disponible. Tu pourras la vérifier avant de remplacer celle de ton compte.</p>'+btn('Importer la progression de cet appareil','account-import','secondary')+'</section>':'')+'<section class="panel"><h2>Sécurité du compte</h2><details class="account-security"><summary>Modifier mon mot de passe</summary><form id="account-password-form">'+accountField('Mot de passe actuel','profile-current-password','password','autocomplete="current-password" maxlength="128"')+accountField('Nouveau mot de passe','profile-password','password','autocomplete="new-password" minlength="10" maxlength="128"')+accountField('Confirmer le nouveau mot de passe','profile-confirm','password','autocomplete="new-password" minlength="10" maxlength="128"')+'<button class="btn secondary" type="submit">Modifier mon mot de passe</button></form></details></section><div id="account-feedback" class="account-feedback" role="status" tabindex="-1"></div></div></div>');
}
function accountLoading(){
 const failed=account?.info().status==='unavailable';
 $('#app').innerHTML='<main id="main" class="account-loading"><span class="brandmark">✳</span><h1>'+(failed?'Ton profil est momentanément indisponible.':'Ouverture de ton espace…')+'</h1><p>'+(failed?'Vérifie ta connexion pour retrouver tes données personnelles.':'Un instant, nous retrouvons tes révisions.')+'</p>'+(failed?btn('Réessayer','account-sync'):'')+'</main>';
}
async function accountAction(action,button){
 if(action==='account-mode'){if(accountBusy)return;accountMode=button.dataset.mode;loginPage();return}
 if(action==='account-show-password'){const field=$('#account-password'),show=field.type==='password';field.type=show?'text':'password';button.textContent=show?'Masquer':'Afficher';button.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe');return}
 if(action==='account-import'){const data=account.guest();if(data)await importState(new File([JSON.stringify(data)],'progression-invite.json',{type:'application/json'}));return}
 if(action==='account-cloud'||action==='account-local'){await account.resolve(action==='account-cloud'?'cloud':'local');if(view==='profile')profilePage();return}
 if(action==='account-sync'){button.disabled=true;await account.refresh();if(view==='profile')profilePage();else if(account.info().ready)route();return}
 if(action==='account-signout'){
  if(accountBusy)return;accountBusy=true;button.disabled=true;
  try{await account.signOut();location.hash='login';toast('Tu es déconnecté. Tes révisions sont conservées sur ton compte.')}
  catch(error){accountFeedback(error.message,true)}finally{accountBusy=false;button.disabled=false}
 }
}
async function accountSubmit(form){
 if(accountBusy)return;accountBusy=true;const submit=form.querySelector('[type="submit"]');submit.disabled=true;
 try{
  if(form.id==='account-auth-form'){
   const email=$('#account-email').value.trim(),password=$('#account-password').value;
   if(form.dataset.mode==='signup'){
    if(password!==$('#account-confirm').value){accountFeedback('Les deux mots de passe ne correspondent pas.',true);return}
    const signed=await account.signUp(email,password,$('#account-name').value.trim());
    if(!signed)accountFeedback('Vérifie ta boîte e-mail pour confirmer ton compte. Si tu as déjà un compte, utilise Connexion.');
   }else await account.signIn(email,password);
  }else if(form.id==='account-profile-form'){
   state.name=$('#profile-name').value.trim()||'Étudiant';state.goal=Math.max(5,Math.min(200,Number($('#profile-goal').value)||20));save();await account.flush();profilePage();accountFeedback(account.info().status==='synced'?'Ton profil est enregistré.':'Ton profil est conservé sur cet appareil. La synchronisation reste à terminer.');
  }else if(form.id==='account-password-form'){
   if($('#profile-password').value!==$('#profile-confirm').value){accountFeedback('Les deux nouveaux mots de passe ne correspondent pas.',true);return}
   await account.password($('#profile-current-password').value,$('#profile-password').value);form.reset();accountFeedback('Ton mot de passe a été modifié.');
  }
 }catch(error){accountFeedback(authError(error),true)}finally{accountBusy=false;submit.disabled=false}
}

function render(){if(!account?.info().ready){accountLoading();return}if(view==='login')loginPage();else if(view==='profile')profilePage();else if(view==='home')home();else if(view==='objective-favorites')objectiveFavoritesPage();else if(view==='catalog')catalogPage();else if(view==='item'&&currentItem)renderItem();else if(view==='review')reviewPage();else if(view==='images')imageCardsPage();else if(view==='errors')errorsPage();else if(view==='planning')planningPage();else if(view==='stats')statsPage();else if(view==='focus')focusPage()}
function route(){
 if(!account?.info().ready){accountLoading();return}
 const hash=location.hash.slice(1)||'home';routeEpoch++;
 if(hash.startsWith('rubrique-'))return;
 if(hash.startsWith('item/')){const n=Number(hash.split('/')[1]);tab=hash.split('/')[2]==='algorithmes'&&window.ATLAS_ALGORITHMS?.forItem(n).length?'algorithmes':'objectifs';if(catalog.some(c=>c.numero===n)){itemPage(n,hash.split('/')[2]);window.scrollTo(0,0);return}}
 if(hash.startsWith('images/')){view='images';closeModal();imageCardsPage(hash.split('/')[1]);window.scrollTo(0,0);return}
 view=['home','catalog','objective-favorites','review','images','errors','planning','stats','focus','login','profile'].includes(hash)?hash:'home';closeModal();render();window.scrollTo(0,0);
}
document.addEventListener('click',async e=>{
 if(compactNavigation.matches&&e.target.closest('.sidebar a[href]'))closeNavigation();
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action,n=Number(b.dataset.item);
 if(action.startsWith('account-')){e.preventDefault();await accountAction(action,b);return}
 if(action!=='menu'&&compactNavigation.matches&&b.closest('.sidebar'))closeNavigation();
 if(action!=='open-search-item')e.preventDefault();
 if(action==='menu'){if(compactNavigation.matches){$('.sidebar').classList.toggle('open')}else{state.sidebarCollapsed=!state.sidebarCollapsed;save()}syncSidebar();}
 else if(action==='close-navigation')closeNavigation();
 else if(['reading-smaller','reading-larger','reading-reset'].includes(action)){state.readingScale=action==='reading-reset'?1:readingScale(readingScale(state.readingScale)+(action==='reading-larger'?.1:-.1));save();syncReading()}
 else if(action==='theme'){state.theme=state.theme==='dark'?'light':'dark';save();render()}
 else if(action==='settings')settings();
 else if(action==='search')searchModal();
 else if(action==='close-modal')closeModal();
 else if(action==='open-search-item'){closeModal();if(location.hash===b.getAttribute('href'))route()}
 else if(action==='subject'){filter.subject=subjects.find(s=>normalize(s).includes(normalize(b.dataset.subject)))||'';filter.status='all';filter.query='';location.hash='catalog';if(view==='catalog')catalogPage()}
 else if(action==='catalog-filter'){filter.status=b.dataset.filter;filter.limit=48;catalogPage()}
 else if(action==='more'){filter.limit+=48;renderCatalog()}
 else if(action==='reset-filter'){filter={query:'',subject:'',status:'all',limit:48};catalogPage()}
 else if(action==='favorite'){const yes=state.favorites.includes(n);state.favorites=yes?state.favorites.filter(x=>x!==n):[...state.favorites,n];save();if(view==='catalog')renderCatalog();else render();toast(yes?'Item retiré des favoris.':'Item ajouté aux favoris.')}
 else if(action==='objective-favorite')toggleObjectiveFavorite(b);
 else if(action==='objective-filter'){objectiveFilter=b.dataset.filter==='favorites'?'favorites':'all';applyObjectiveFilter()}
 else if(action==='objective-favorites-retry')objectiveFavoritesPage();
 else if(action==='objective-favorites-reset'){objectiveFavoriteFilter={query:'',subject:''};objectiveFavoritesPage()}
 else if(action==='review-objective-favorites'){session=null;mode='objective-favorites';location.hash='review';if(view==='review')reviewPage()}
 else if(action==='item-tab'){tab=b.dataset.tab;renderItem()}
 else if(action==='scroll-rubrique')$('#rubrique-'+b.dataset.rubrique)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 else if(action==='master'){const id=b.dataset.obj,yes=state.mastered[id];let reward=false;if(yes)delete state.mastered[id];else{state.mastered[id]=true;if(!state.objectiveAwards[id]){state.objectiveAwards[id]=true;state.xp+=5;track('objectives');reward=true}}save();b.closest('.objective').classList.toggle('done',!yes);b.innerHTML=icon(!yes?'check':'plus')+(!yes?'Acquis':'Marquer acquis');b.classList.toggle('soft',!yes);b.classList.toggle('secondary',!!yes);const aside=$('.reading-aside');if(aside){const count=masteredCount(currentItem.numero);aside.querySelector('.progress-label').innerHTML='<span>Objectifs acquis</span><span>'+count+'/'+currentItem.objectifs.length+'</span>';aside.querySelector('.progress-track span').style.width=(count/currentItem.objectifs.length*100)+'%'}toast(yes?'Objectif remis à travailler.':reward?'Objectif acquis. +5 XP':'Objectif acquis.')}
 else if(action==='save-note'){state.notes[currentItem.numero]=$('#item-note').value;save();toast('Tes notes sont enregistrées.')}
 else if(action==='review-mode'){mode=b.dataset.mode;reviewPage()}
 else if(action==='quick-session'){session=null;startSession({length:10})}
 else if(action==='start-session'){session=null;startSession({length:Number($('#review-length').value),subject:$('#review-subject').value,sessionMode:mode})}
 else if(action==='review-item'){session=null;startSession({item:n,length:10})}
 else if(action==='reveal'){if(session&&!session.done){session.revealed=true;renderSession()}}
 else if(action==='grade')grade(Number(b.dataset.grade));
 else if(action==='end-session'){modal('Terminer cette session ?','<p>Les '+session.index+' cartes déjà évaluées restent enregistrées. Tu pourras lancer une autre session quand tu voudras.</p><div class="modal-actions">'+btn('Continuer','close-modal','secondary')+btn('Terminer','finish-session')+'</div>')}
 else if(action==='finish-session'){session=null;closeModal();location.hash='home'}
 else if(action==='another-session'){session=null;reviewPage()}
 else if(action==='new-error')newError(n||null,b.dataset.obj);
 else if(action==='resolve-error'){const x=state.errors.find(x=>x.id===b.dataset.id);if(x){x.resolved=!x.resolved;save();render();toast(x.resolved?'Une notion de plus consolidée.':'Notion remise à travailler.')}} 
 else if(action==='delete-error'){modal('Retirer cette erreur ?','<p>Cette entrée sera retirée de ton carnet.</p><div class="modal-actions">'+btn('Annuler','close-modal','secondary')+btn('Retirer','confirm-delete-error','','data-id="'+b.dataset.id+'"')+'</div>')}
 else if(action==='confirm-delete-error'){state.errors=state.errors.filter(x=>x.id!==b.dataset.id);save();closeModal();render()}
 else if(action==='new-plan')newPlan(b.dataset.date||today());
 else if(action==='week-prev'){weekOffset--;planningPage()}
 else if(action==='week-next'){weekOffset++;planningPage()}
 else if(action==='week-today'){weekOffset=0;planningPage()}
 else if(action==='toggle-plan'){const p=state.plans.find(p=>p.id===b.dataset.id);if(p){p.done=!p.done;save();planningPage()}}
 else if(action==='delete-plan'){state.plans=state.plans.filter(p=>p.id!==b.dataset.id);save();planningPage();toast('Session retirée du planning.')}
 else if(action==='timer-toggle')timerToggle();
 else if(action==='timer-mode'){clearInterval(timer.handle);timer.running=false;timer.duration=Number(b.dataset.minutes)*60;timer.seconds=timer.duration;focusPage()}
 else if(action==='timer-reset'){clearInterval(timer.handle);timer.running=false;timer.seconds=timer.duration;focusPage()}
 else if(action==='export')download('atlas-progression-'+today()+'.json',JSON.stringify(state,null,2),'application/json');
 else if(action==='import')$('#import-file').click();
 else if(action==='confirm-import'){if(!window.ATLAS_PENDING_IMPORT)return;download('atlas-avant-import-'+today()+'.json',JSON.stringify(state,null,2),'application/json');state=window.ATLAS_PENDING_IMPORT;delete window.ATLAS_PENDING_IMPORT;session=null;save();closeModal();render();toast('Sauvegarde restaurée.')}
 else if(action==='export-calendar')exportCalendar();
});
document.addEventListener('input',e=>{
 if(e.target.id==='catalog-query'){filter.query=e.target.value;filter.limit=48;renderCatalog()}
 if(e.target.id==='global-search')renderSearch(e.target.value);
 if(e.target.id==='objective-favorites-query'){objectiveFavoriteFilter.query=e.target.value;renderObjectiveFavoriteResults()}
 if(e.target.id==='focus-intent'){state.focusIntent=e.target.value;save()}
});
document.addEventListener('change',e=>{
 if(e.target.id==='catalog-subject'){filter.subject=e.target.value;filter.limit=48;renderCatalog()}
 if(e.target.id==='import-file')importState(e.target.files[0]);
 if(e.target.id==='objective-favorites-subject'){objectiveFavoriteFilter.subject=e.target.value;renderObjectiveFavoriteResults()}
});
document.addEventListener('submit',e=>{
 e.preventDefault();
 if(e.target.id.startsWith('account-')){void accountSubmit(e.target);return}
 if(e.target.id==='error-form'){const n=Number($('#error-item').value)||null;if(n&&!catalog.some(c=>c.numero===n)){toast('Cet item ne figure pas dans ton catalogue.');return}state.errors.push({id:crypto.randomUUID(),item:n,objective:$('#error-objective').value,title:$('#error-title').value.trim(),correction:$('#error-correction').value.trim(),date:today(),resolved:false});save();closeModal();if(view==='errors'||view==='item')render();toast('Ton repère est enregistré.')}
 else if(e.target.id==='plan-form'){const n=Number($('#plan-item').value)||null;if(n&&!catalog.some(c=>c.numero===n)){toast('Cet item ne figure pas dans ton catalogue.');return}state.plans.push({id:crypto.randomUUID(),title:$('#plan-title').value.trim(),date:$('#plan-date').value,minutes:Number($('#plan-minutes').value),item:n,done:false});save();closeModal();planningPage();toast('Session ajoutée au planning.')}
 else if(e.target.id==='settings-form'){state.name=$('#setting-name').value.trim()||'Kevin';state.goal=Math.max(5,Math.min(200,Number($('#setting-goal').value)));save();closeModal();render();toast('Préférences enregistrées.')}
});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchModal();return}
 if(e.key==='Escape'){closeModal();closeNavigation();return}
 if($('.modal')){
  if(e.key==='Tab'){const els=[...$('.modal').querySelectorAll('button,a[href],input:not([hidden]),select,textarea')].filter(x=>!x.disabled),first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  return;
 }
 if(compactNavigation.matches&&$('.sidebar.open')){
  if(e.key==='Tab'){
   const controls=[...$('.sidebar').querySelectorAll('a[href],button:not(:disabled)')];
   const first=controls[0],last=controls[controls.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
  return;
 }
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(view==='review'&&session&&!session.done){
  if(e.code==='Space'&&!session.revealed){e.preventDefault();session.revealed=true;renderSession()}
  else if(session.revealed&&['1','2','3','4'].includes(e.key)){e.preventDefault();grade(Number(e.key)-1)}
 }
});
compactNavigation.addEventListener('change',closeNavigation);
window.addEventListener('hashchange',route);
account=window.ATLAS_ACCOUNT.create({
 clean:cleanAccountState,
 fresh:user=>({...defaults(),name:user?String(user.user_metadata?.display_name||'Étudiant').slice(0,30):'Invité'}),
 lock:()=>{clearInterval(timer.handle);timer.running=false;timer.seconds=timer.duration;session=null;currentItem=null;routeEpoch++;delete window.ATLAS_PENDING_IMPORT;closeModal();state=defaults();document.documentElement.classList.remove('navigation-open');accountLoading()},
 apply:next=>{state=next;session=null},
 open:()=>{if(account.info().user&&location.hash==='#login'){location.hash='profile'}else route()},
 status:accountStatus,
 backup:data=>download('atlas-version-conservee-'+Date.now()+'.json',JSON.stringify(data,null,2),'application/json'),
 guestChanged:next=>{if(!$('.modal')&&!session){state=next;render()}},
 recovery:()=>toast('Tu peux modifier ton mot de passe depuis ton compte ATLAS d’origine.')
});
void account.start();
})();





