/* One reading page per item. Presentation changes never rewrite course/card data. */
(() => {
  'use strict';
  // Approved editorial labels for the vaccination pilot; other titles stay source-derived.
  const labels = {
    '146-1': ['Vaccins, sérothérapie et rappels', 'Vaccin = immunité active. Sérothérapie = anticorps administrés.'],
    '146-2': ['Comprendre la protection vaccinale', 'La mémoire immunologique explique l’effet des rappels.'],
    '146-3': ['Vacciner en pratique', 'Vérifier l’indication, le terrain et le produit avant administration.'],
    '146-4': ['Identifier la population concernée', 'Risque de gravité et risque d’exposition sont deux notions distinctes.'],
    '146-5': ['Organiser un rattrapage', 'Toute dose valide compte : compléter sans recommencer systématiquement.'],
    '146-6': ['Calendrier vaccinal général', 'Distinguer vaccination obligatoire, recommandation et rattrapage.'],
    '146-7': ['Âge, grossesse et professionnels', 'Adapter le calendrier à l’âge, à la grossesse et à l’exposition professionnelle.'],
    '146-8': ['Terrains particuliers', 'Adapter aux antécédents, à l’immunité et au risque infectieux.'],
    '146-9': ['Douleur et traçabilité', 'Prévenir la douleur et tracer chaque vaccination.']
  };
  const sections = {
    '146-1': ['Immunité active et passive', 'Primo, rappel, rattrapage', 'Vaccins vivants atténués', 'Vaccins non vivants', 'Conjugaison et prévention'],
    '146-3': ['Avant l’injection', 'Coadministration', 'Voie et technique', 'Contre-indications', 'Surveillance et traçabilité', 'Professionnels habilités'],
    '146-5': ['Reconstituer les doses', 'En l’absence de preuve', 'Actualiser le rattrapage'],
    '146-6': ['Le calendrier de référence', 'Nourrisson', 'Méningocoques', 'Papillomavirus', 'Rappels et vaccins de l’adulte'],
    '146-7': ['À partir de 65 ans', 'Pendant la grossesse', 'Vaccins vivants', 'Professionnels', 'Rougeole : cadre applicable'],
    '146-8': ['Prématurité', 'Immunodépression', 'Asplénie', 'Transplantation', 'VIH et BCG', 'Expositions professionnelles']
  };

  const sessions = new Map();
  let resize, intersection, currentMain;
  const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const make = (tag, cls, html) => { const el=document.createElement(tag);el.className=cls;if(html!==undefined)el.innerHTML=html;return el; };
  const button = (text,action) => `<button type="button" data-reading="${action}">${text}</button>`;
  const shortTitle = o => {
    if(labels[o.id])return labels[o.id][0];
    const title=String(o.titre||'Objectif').replace(/^(?:connaître|connaitre|savoir)\s+/i,'').replace(/^(?:le |la |les |l[’'])/i,'');
    return title.charAt(0).toLocaleUpperCase('fr')+title.slice(1);
  };
  const serial = id => String(id).split('-').slice(1).join('-').padStart(2,'0');
  function capture() {
    if(currentMain?.isConnected) {
      const session=sessions.get(currentMain.dataset.readingItem);
      if(session) {
        const objectives=[...currentMain.querySelectorAll('.objective')];
        session.opened=new Set(objectives.filter(d=>d.open).map(d=>d.dataset.objectiveId));
        session.scrollTop=window.scrollY;
        const boundary=(document.querySelector('.topbar')?.getBoundingClientRect().bottom||76)+90;
        const anchor=objectives.find(d=>!d.hidden&&d.getBoundingClientRect().top<=boundary&&d.getBoundingClientRect().bottom>boundary);
        session.anchor=anchor?{id:anchor.dataset.objectiveId,top:anchor.getBoundingClientRect().top}:null;
      }
    }
    resize?.disconnect();intersection?.disconnect();currentMain=null;
  }
  function enhance(item) {
    const first=document.querySelector('.objective[data-objective-id]');
    const main=first?.closest('main');
    const layout=main?.querySelector('.reading-layout');
    if(!layout||main.dataset.readingItem)return;
    const number=String(item.numero), objectives=[...layout.querySelectorAll('.objective')];
    const byId=new Map(item.objectifs.map(o=>[o.id,o]));
    if(objectives.some(d=>!byId.has(d.dataset.objectiveId)))return;
    currentMain=main;main.classList.add('reader-item');main.dataset.readingItem=number;
    let session=sessions.get(number);
    const parts=location.hash.slice(1).split('/');
    const routeTarget=parts[0]==='item'&&parts[1]===number&&byId.has(parts[2])?parts[2]:null;
    if(!session) {session={opened:new Set([routeTarget||first.dataset.objectiveId]),active:null,scrollTop:null,anchor:null,quizzes:new Map(),routeTarget:null};sessions.set(number,session);}
    const newTarget=routeTarget&&routeTarget!==session.routeTarget;
    if(newTarget)session.opened.add(routeTarget);
    session.routeTarget=routeTarget;
    const header=main.querySelector('.reading-header');
    const oldAside=layout.querySelector('.reading-aside');
    const sourceNote=oldAside?.querySelector('.source-note')?.cloneNode(true);
    const legendLink=main.querySelector('.notion-legend a');
    const counts=['A','B'].map(rank=>{const n=item.objectifs.filter(o=>o.rang===rank).length;return n?`${n} rang ${rank}`:''}).filter(Boolean);
    const refs=make('div','reader-references',`<span>${item.objectifs.length} objectifs · ${counts.join(' · ')}</span>`);
    if(item.courseEdition?.verification==='pending')refs.append(make('span','reader-pending','Vérification en cours'));
    else if(item.courseEdition?.reviewedAt) {
      const date=new Date(item.courseEdition.reviewedAt+'T12:00:00Z');
      if(!isNaN(date))refs.append(make('span','',`Relu le ${esc(date.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}))}`));
    }
    if(legendLink)refs.append(legendLink.cloneNode(true));
    header.append(refs);
    oldAside?.remove();
    const course=layout.firstElementChild;course.classList.add('reader-document');
    const ordered=objectives.map(d=>byId.get(d.dataset.objectiveId));
    const tocMarkup=()=>`<nav aria-label="Sommaire des objectifs">${ordered.map(o=>`<button type="button" data-reading-target="${esc(o.id)}" title="${esc(o.titre)}"><span class="reader-toc-num">${esc(serial(o.id))}</span><span>${esc(shortTitle(o))}</span><span class="reader-toc-rank ${o.rang==='B'?'b':''}">${esc(o.rang)}</span></button>`).join('')}</nav>`;
    const aside=make('aside','reader-toc',`<div class="reader-toc-caption">Dans cette fiche</div>${tocMarkup()}${item.courseEdition?.source==='notion'?'<div class="reader-toc-note"><span class="reader-color-dots"><i></i><i></i><i></i><i></i></span>Tes repères Notion<br><small>Couleurs du cours conservées</small></div>':''}`);
    layout.prepend(aside);
    const toolbar=make('div','reader-toolbar',`<details class="reader-mobile-toc"><summary>Sommaire <span>${item.objectifs.length} objectifs</span><i></i></summary>${tocMarkup()}</details><span class="reader-toolbar-label">Les objectifs du cours</span><div class="reader-open-tools">${button('Tout ouvrir','open-all')}${button('Tout replier','close-all')}</div>`);
    layout.before(toolbar);
    if(sourceNote){const provenance=make('div','reader-provenance');provenance.append(sourceNote);layout.after(provenance);}
    const cardsById=new Map();
    for(const card of item.cards||[]) {if(!cardsById.has(card.o))cardsById.set(card.o,[]);cardsById.get(card.o).push(card);}
    const sync=()=>{session.opened=new Set(objectives.filter(d=>d.open).map(d=>d.dataset.objectiveId));};
    function setActive(id) {
      session.active=id;
      main.querySelectorAll('[data-reading-target]').forEach(b=>b.setAttribute('aria-current',b.dataset.readingTarget===id?'location':'false'));
    }
    function renderCard(d) {
      const id=d.dataset.objectiveId,cards=cardsById.get(id),state=session.quizzes.get(id);
      if(!cards?.length||!state)return;
      state.index=Math.min(state.index,cards.length-1);
      const c=cards[state.index],recall=d.querySelector('.reader-recall');
      recall.innerHTML=`<div class="reader-recall-top"><span>Rappel actif · carte ${state.index+1} / ${cards.length}</span>${button('Revenir au cours','return')}</div><div class="reader-card" data-card-id="${esc(c.i)}"><p class="reader-question">${esc(c.q)}</p><details class="reader-answer" ${state.revealed?'open':''}><summary>Afficher la réponse</summary><div class="medical">${window.ATLAS_COURSE.sanitize(c.a)}</div></details></div>${cards.length>1?`<div class="reader-card-nav"><button type="button" data-reading="previous-card" ${state.index===0?'disabled':''}>← Carte précédente</button><button type="button" data-reading="next-card" ${state.index===cards.length-1?'disabled':''}>Carte suivante →</button></div>`:''}`;
      recall.querySelector('.reader-answer').addEventListener('toggle',e=>{if(e.target.isConnected)state.revealed=e.target.open;});
      window.ATLAS_ILLUSTRATIONS?.hydrate(recall);
    }
    function study(d,testing,focus=true) {
      const id=d.dataset.objectiveId;
      if(!cardsById.get(id)?.length)return;
      if(!session.quizzes.has(id))session.quizzes.set(id,{index:0,revealed:false,testing:false});
      const state=session.quizzes.get(id);state.testing=testing;
      if(testing)renderCard(d);else {state.revealed=false;d.querySelector('.reader-recall').replaceChildren();}
      d.querySelector('.reader-course-content').hidden=testing;
      d.querySelector('.reader-introduction').hidden=testing;
      d.querySelector('.reader-study-bar').hidden=testing;
      d.querySelector('.reader-recall').hidden=!testing;
      d.querySelector('.reader-test-button').setAttribute('aria-expanded',String(testing));
      if(focus)(testing?d.querySelector('.reader-answer>summary'):d.querySelector('.reader-test-button')).focus({preventScroll:true});
    }
    function jump(id) {
      const target=objectives.find(d=>d.dataset.objectiveId===id);if(!target)return;
      if(target.hidden)main.querySelector('[data-action="objective-filter"][data-filter="all"]')?.click();
      target.open=true;toolbar.querySelector('details').open=false;setActive(id);sync();
      session.routeTarget=id;history.replaceState(null,'',`#item/${number}/${id}`);
      requestAnimationFrame(()=>{target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.querySelector('summary').focus({preventScroll:true});});
    }
    objectives.forEach(d=>{
      const id=d.dataset.objectiveId,o=byId.get(id);d.id='reading-'+id;d.open=session.opened.has(id);
      const summary=d.querySelector(':scope > summary'),favorite=summary.querySelector('button'),badge=summary.querySelector('.objective-image-count');
      summary.innerHTML=`<span class="reader-number">${esc(serial(id))}</span><span class="reader-objective-title">${esc(shortTitle(o))}</span><span class="rank ${o.rang==='B'?'b':''}">${esc(o.rang)}</span><span class="reader-chevron" aria-hidden="true"></span>`;
      if(favorite)summary.insertBefore(favorite,summary.lastElementChild);
      const body=d.querySelector('.objective-body'),medical=body.querySelector('.medical');
      medical.classList.add('reader-original-course');
      const intro=make('div','reader-introduction',`<div class="reader-objective-meta"><span>Objectif ${esc(id)}</span><details class="reader-official"><summary>Intitulé officiel</summary><p>${esc(o.titre)}</p></details></div>${labels[id]?`<div class="reader-essential"><span>Repère de synthèse</span><p>${esc(labels[id][1])}</p></div>`:''}`);
      if(badge)intro.querySelector('.reader-objective-meta').append(badge);
      const content=make('div','reader-course-content');content.id='reading-course-'+id;
      // Move the original DOM, including illustrations, without replacing source nodes.
      for(const node of [...body.childNodes])if(!node.classList?.contains('objective-tools'))content.append(node);
      body.prepend(intro,content);
      const list=medical.querySelector('.notion-course > ul');
      if(list&&sections[id]&&list.children.length===sections[id].length) {
        list.classList.add('reader-course-sections');
        [...list.children].forEach((li,i)=>li.insertAdjacentHTML('afterbegin',`<h3 class="reader-section-label">${esc(sections[id][i])}</h3>`));
      } else if(!labels[id]) {
        // Highlight a complete existing introductory paragraph, never an extracted sentence.
        const sourceRoot=medical.querySelector(':scope > .notion-course')||medical;
        const lead=sourceRoot.firstElementChild;
        if(lead?.tagName==='P'&&lead.textContent.trim().length>=40&&lead.textContent.length<=360&&!lead.querySelector('img,br')&&!/:\s*$/.test(lead.textContent))lead.classList.add('reader-lead');
      }
      const cards=cardsById.get(id)||[];
      if(cards.length) {
        const bar=make('div','reader-study-bar',`<span>Lecture du cours</span><button type="button" class="reader-test-button" data-reading="test" aria-expanded="false" aria-controls="reading-recall-${esc(id)}">Me tester <span aria-hidden="true">↗</span></button>`);
        content.before(bar);
        const recall=make('section','reader-recall');recall.hidden=true;recall.id='reading-recall-'+id;content.after(recall);
        if(session.quizzes.get(id)?.testing)study(d,true,false);
      }
      d.addEventListener('toggle',()=>{if(!d.isConnected)return;sync();if(d.open)setActive(id);});
    });
    main.addEventListener('click',e=>{
      const link=e.target.closest('[data-reading-target]');if(link){jump(link.dataset.readingTarget);return;}
      const b=e.target.closest('[data-reading]');if(!b)return;
      const action=b.dataset.reading;
      if(action==='open-all'||action==='close-all'){objectives.filter(d=>!d.hidden).forEach(d=>d.open=action==='open-all');sync();return;}
      const d=b.closest('.objective');if(!d)return;
      if(action==='test'||action==='return')study(d,action==='test');
      else if(action==='next-card'||action==='previous-card') {
        const state=session.quizzes.get(d.dataset.objectiveId),cards=cardsById.get(d.dataset.objectiveId);
        const next=state.index+(action==='next-card'?1:-1);if(next<0||next>=cards.length)return;
        state.index=next;state.revealed=false;renderCard(d);
        d.querySelector('.reader-answer>summary').focus({preventScroll:true});
      }
    });
    toolbar.addEventListener('keydown',e=>{if(e.key==='Escape'){toolbar.querySelector('details').open=false;toolbar.querySelector('summary').focus();}});
    const topbar=document.querySelector('.topbar');
    const measure=()=>main.style.setProperty('--reader-top',(topbar?.getBoundingClientRect().height||76)+'px');
    measure();resize=new ResizeObserver(measure);if(topbar)resize.observe(topbar);
    intersection=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting&&!e.target.hidden).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length)setActive(visible[0].target.dataset.objectiveId);},{rootMargin:'-25% 0px -60% 0px',threshold:0});
    objectives.forEach(d=>intersection.observe(d));
    setActive(routeTarget||session.active||first.dataset.objectiveId);
    const savedY=session.scrollTop,anchor=session.anchor;session.scrollTop=null;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!main.isConnected)return;
      if(newTarget){document.getElementById('reading-'+routeTarget)?.scrollIntoView({block:'start',behavior:'instant'});return;}
      if(savedY!==null){const target=anchor&&document.getElementById('reading-'+anchor.id);window.scrollTo({top:target?window.scrollY+target.getBoundingClientRect().top-anchor.top:savedY,behavior:'instant'});}
    }));
  }
  window.ATLAS_OBJECTIVE_READING={capture,enhance};
})();
