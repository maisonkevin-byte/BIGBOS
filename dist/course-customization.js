/* Personal course versions. Original objectives, cards and illustrations stay immutable. */
(() => {
  'use strict';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const PALETTE = [
    ['yellow_bg','Notion importante · jaune'],
    ['brown_bg','Notion importante · marron'],
    ['orange_bg','Notion importante · orange'],
    ['blue_bg','Examen complémentaire hors biologie'],
    ['red_bg','Maladie'], ['green_bg','Traitement non médicamenteux'],
    ['purple_bg','Professionnel de santé ou avis'],
    ['red','Signes fonctionnels ou anomalies cliniques'],
    ['blue','Examens biologiques'], ['pink','Chiffres'], ['green','Médicaments']
  ];
  const fresh = () => ({ version:1, objectives:{}, sections:{}, drafts:{}, previous:{} });
  const idOK = id => /^\d{1,3}-\d+$/.test(id) || /^personal-[a-z0-9-]{8,80}$/.test(id);
  const object = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const MAX_HTML = 160000;
  const classOK = c => c!=='course-semantic' && /^(?:nc-(?:gray|brown|orange|yellow|green|blue|purple|pink|red)(?:_bg)?|nc-bold|kw-[a-z]+|notion-course|callout(?:-[a-z]+)?|obj-callout|source-note|course-[a-z-]+|atlas-source-details)$/.test(c);
  const allowed = new Set('P BR STRONG B EM I U S STRIKE UL OL LI TABLE THEAD TBODY TFOOT TR TH TD CAPTION DIV SPAN H1 H2 H3 H4 H5 H6 FIGURE FIGCAPTION IMG A BLOCKQUOTE SUP SUB HR DETAILS SUMMARY MARK CODE PRE LABEL INPUT'.split(' '));
  const styleColors = {
    '#e03e3e':'red', '#c93232':'red', '#0b6e99':'blue', '#ad1a72':'pink', '#4d6461':'green',
    '#fbf3db':'yellow_bg', '#e9e5e3':'brown_bg', '#f6e9d9':'orange_bg',
    '#ddebf1':'blue_bg', '#fbe4e4':'red_bg', '#ddedea':'green_bg', '#eae4f2':'purple_bg'
  };
  function hex(color) {
    const numbers = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return numbers ? '#'+numbers.slice(1).map(n=>(+n).toString(16).padStart(2,'0')).join('') : color.toLowerCase();
  }
  function cleanHTML(html) {
    const t = document.createElement('template'); t.innerHTML = String(html || '');
    for (const el of [...t.content.querySelectorAll('*')]) {
      if (!allowed.has(el.tagName)) {
        if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM'].includes(el.tagName)) el.remove();
        else el.replaceWith(...el.childNodes);
        continue;
      }
      for (const property of ['color','backgroundColor']) {
        const key = styleColors[hex(el.style[property] || '')];
        if (key && key.endsWith('_bg') === (property === 'backgroundColor')) el.classList.add('nc-'+key);
      }
      for (const a of [...el.attributes]) {
        const keep = ['class','href','src','alt','title','colspan','rowspan','start'].includes(a.name)
          || (a.name === 'data-type' && ['taskList','taskItem'].includes(a.value))
          || (a.name === 'data-checked' && el.tagName === 'LI')
          || (['type','checked'].includes(a.name) && el.tagName === 'INPUT');
        if (!keep) el.removeAttribute(a.name);
      }
      const cls = [...el.classList].filter(classOK).join(' ');
      if (cls) el.className = cls; else el.removeAttribute('class');
      if (el.tagName === 'A') {
        if (!/^(https?:\/\/|#)/i.test(el.getAttribute('href') || '')) el.removeAttribute('href');
        else { el.target='_blank'; el.rel='noopener noreferrer'; }
      }
      if (el.tagName === 'IMG') {
        if (!/^https:\/\//i.test(el.getAttribute('src') || '')) el.replaceWith(document.createTextNode(el.alt || ''));
        else el.loading='lazy';
      }
      if (el.tagName === 'INPUT') {
        if (el.type !== 'checkbox' || !el.closest('li[data-type="taskItem"]')) el.remove();
        else el.disabled=true;
      }
    }
    return t.innerHTML;
  }
  function cleanEntry(e) {
    if (!e || typeof e.html !== 'string' || e.html.length > MAX_HTML) return null;
    return { html:cleanHTML(e.html), title:String(e.title || '').slice(0,180),
      group:String(e.group || '').slice(0,160), learned:e.learned === true,
      deleted:e.deleted === true, item:Number.isInteger(e.item)?e.item:null,
      semanticVersion:e.semanticVersion===1?1:0, updatedAt:String(e.updatedAt || '').slice(0,40) };
  }
  function clean(value) {
    const d = object(value), out = fresh();
    for (const field of ['objectives','drafts','previous']) {
      for (const [id, entry] of Object.entries(object(d[field]))) {
        if (!idOK(id)) continue;
        if (field === 'previous' && entry === null) { out[field][id] = null; continue; }
        const e = cleanEntry(entry); if (e) out[field][id] = e;
      }
    }
    for (const [item, entries] of Object.entries(object(d.sections))) {
      if (!/^\d{1,3}$/.test(item) || !Array.isArray(entries)) continue;
      const seen = new Set();
      out.sections[item] = entries.flatMap(e => {
        const row = cleanEntry(e);
        if (!row || !/^personal-[a-z0-9-]{8,80}$/.test(e.id) || seen.has(e.id)) return [];
        seen.add(e.id); return [{ ...row, id:e.id }];
      });
    }
    return out;
  }
  function legend(item) {
    return `<details class="ce-legend"><summary>Code couleurs des fiches <span>Texte et surlignage</span></summary>
      <div class="ce-legend-body notion-course"><div><h3>Surlignage</h3>${PALETTE.filter(p=>p[0].endsWith('_bg')).map(([c,l])=>`<p><span class="nc-${c}">${l}</span></p>`).join('')}</div>
      <div><h3>Couleur du texte</h3>${PALETTE.filter(p=>!p[0].endsWith('_bg')).map(([c,l])=>`<p><span class="nc-${c}">${l}</span></p>`).join('')}</div>
      <p class="ce-legend-note">Repères indicatifs d’après la <a href="https://app.docecos.fr/info" target="_blank" rel="noopener noreferrer">FAQ DocECOS</a>. Les couleurs suivent la nature des notions dans le texte. Les termes ambigus restent neutres ; tes annotations restent modifiables.${item?.courseEdition?.notionUrl ? ` <a href="${esc(item.courseEdition.notionUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir mon cours Notion ↗</a>` : ''}</p></div></details>`;
  }
  let context, editor, dialog, editorPromise, active, timer, loadEpoch=0, previousFocus;
  const getStore = () => context.state.courseEdits ||= fresh();
  const current = id => /^personal-/.test(id) ? (getStore().sections[context.item.numero] || []).find(s=>s.id===id) : getStore().objectives[id];
  function commit(next) {
    const old = context.state.courseEdits;
    context.state.courseEdits = next;
    if (!context.save()) { context.state.courseEdits=old; return false; }
    return true;
  }
  const clone = () => JSON.parse(JSON.stringify(getStore()));
  function content(state, objective) {
    return state.courseEdits?.objectives?.[objective.id]?.html ?? objective.contenu;
  }
  function renderHTML(html,version=0) { return window.ATLAS_COURSE_READING.format(window.ATLAS_COURSE_SEMANTICS.annotate(cleanHTML(html),{personal:version===1})); }
  const control = (label, action, extra='') => `<button type="button" class="btn small secondary" data-ce="${action}" ${extra}>${label}</button>`;
  function mount(ctx) {
    context = ctx;
    const main = document.querySelector('main'); if (!main) return;
    const groups = [...new Set(ctx.item.objectifs.map(o=>o.rubrique))];
    for (const d of main.querySelectorAll('.objective[data-objective-id]')) {
      const id = d.dataset.objectiveId, row=current(id), draft=getStore().drafts[id];
      if(row)d.querySelectorAll('.reader-essential,.reader-section-label').forEach(el=>el.remove());
      const tools=document.createElement('div');tools.className='ce-section-tools';
      tools.innerHTML=control(draft?'Reprendre mon brouillon':row?'Modifier ma version':'Modifier cette section','edit',`data-id="${esc(id)}"`)
        +(row?'<span class="ce-personal-label">Version personnelle</span>':'')
        +(row?control('Voir le cours d’origine','original',`data-id="${esc(id)}"`):'')
        +(Object.hasOwn(getStore().previous,id)?control('Revenir à la version précédente','previous',`data-id="${esc(id)}"`):'');
      d.querySelector('.reader-course-content,.objective-body').prepend(tools);
    }
    for (const [i,group] of groups.entries()) {
      const section=main.querySelector('#rubrique-'+i);if(!section)continue;
      const wrap=document.createElement('div');wrap.className='ce-personal-sections';
      const rows=(getStore().sections[ctx.item.numero]||[]).filter(s=>s.group===group);
      const pending=Object.entries(getStore().drafts).filter(([id,s])=>id.startsWith('personal-')&&s.item===ctx.item.numero&&s.group===group&&!current(id));
      wrap.innerHTML=rows.filter(s=>!s.deleted).map(s=>`<details class="ce-personal-section" id="${esc(s.id)}"><summary><span>${esc(s.title || 'Ma section')}</span><small>Personnel${s.learned?' · Acquis':''}</small></summary><div class="ce-personal-body"><div class="ce-section-tools">${control('Modifier','edit',`data-id="${esc(s.id)}"`)}${control(s.learned?'Acquis ✓':'Marquer acquis','learn',`data-id="${esc(s.id)}"`)}${control('Retirer','remove',`data-id="${esc(s.id)}"`)}</div><div class="medical notion-course">${renderHTML(s.html,s.semanticVersion)}</div></div></details>`).join('')
        +pending.map(([id,s])=>`<p class="ce-pending">Brouillon · ${esc(s.title||'Nouvelle section')} ${control('Reprendre le brouillon','edit',`data-id="${esc(id)}"`)}</p>`).join('')
        +control('＋ Ajouter une section personnelle','add',`data-group="${esc(group)}"`)
        +(rows.some(s=>s.deleted)?`<details class="ce-removed"><summary>Sections retirées (${rows.filter(s=>s.deleted).length})</summary>${rows.filter(s=>s.deleted).map(s=>`<p>${esc(s.title)} ${control('Restaurer','restore-section',`data-id="${esc(s.id)}"`)}</p>`).join('')}</details>`:'');
      section.append(wrap);
    }
    const oldNote=main.querySelector('.reader-toc-note');
    if(oldNote)oldNote.innerHTML='<span class="reader-color-dots"><i></i><i></i><i></i><i></i></span>Repères des fiches<br><small>Texte et surlignage</small>';
    main.addEventListener('click', onMainClick);
  }
  function onMainClick(e) {
    const b=e.target.closest('[data-ce]');if(!b)return;
    const id=b.dataset.id, action=b.dataset.ce;
    if(action==='edit')open(id);
    if(action==='add') {
      const id='personal-'+crypto.randomUUID();
      open(id,{title:'',html:'<p></p>',group:b.dataset.group});
    }
    if(action==='original')showOriginal(id);
    if(action==='previous') {
      const next=clone(), old=next.objectives[id]||null;
      if(next.previous[id])next.objectives[id]=next.previous[id];else delete next.objectives[id];
      next.previous[id]=old;
      if(commit(next)){context.render();context.toast('Version précédente rétablie.');}
    }
    if(['learn','remove','restore-section'].includes(action)) {
      const next=clone(), row=next.sections[context.item.numero].find(s=>s.id===id);
      if(action==='learn')row.learned=!row.learned;else row.deleted=action==='remove';
      row.updatedAt=new Date().toISOString();
      if(commit(next)){context.render();if(action!=='learn')context.toast(action==='remove'?'Section retirée. Tu peux la restaurer en bas de la rubrique.':'Section restaurée.');}
    }
  }
  function loadEditor() {
    if(window.ATLAS_RICH_EDITOR)return Promise.resolve();
    if(!editorPromise)editorPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='vendor/course-editor.js?v=20261016-edit1';
      s.onload=resolve;s.onerror=()=>{s.remove();editorPromise=null;reject(Error('L’éditeur n’a pas pu être chargé. Réessaie avec une connexion.'));};document.head.append(s);
    });
    return editorPromise;
  }
  function createDialog(title) {
    previousFocus=document.activeElement;
    dialog=document.createElement('dialog');dialog.className='ce-dialog';
    dialog.setAttribute('aria-labelledby','ce-title');
    dialog.innerHTML=`<header class="ce-dialog-header"><div><small>Item ${context.item.numero} · Mon cours</small><h2 id="ce-title">${esc(title)}</h2></div><button type="button" class="ce-close" data-editor="close" aria-label="Fermer l’éditeur">×</button></header><div class="ce-dialog-body"></div>`;
    document.body.append(dialog);dialog.showModal();document.documentElement.classList.add('ce-editing');
    dialog.addEventListener('cancel',e=>{e.preventDefault();if(close(true))context.render();});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-editor]');if(b)command(b.dataset.editor,b);});
    dialog.addEventListener('mousedown',e=>{if(e.target.closest('[data-command]'))e.preventDefault();});
  }
  async function open(id,newRow) {
    if(dialog&&!close(true))return;
    const o=context.item.objectifs.find(o=>o.id===id), row=current(id)||newRow||getStore().drafts[id]||{html:o?.contenu||'',title:o?.titre||''};
    active={id,newRow,original:o,changed:false};
    const heading=o?document.querySelector(`[data-objective-id="${id}"] .reader-objective-title`)?.textContent:row.title;
    createDialog(newRow?'Ajouter une section':heading || 'Modifier ma section');
    const epoch=++loadEpoch;
    dialog.querySelector('.ce-dialog-body').innerHTML='<p role="status">Ouverture de l’éditeur…</p>';
    try { await loadEditor(); if(epoch!==loadEpoch||!dialog)return; }
    catch(error){if(dialog)dialog.querySelector('.ce-dialog-body').textContent=error.message;return;}
    const draft=getStore().drafts[id], initial=draft||row;
    active.changed=!!draft;active.initial=initial;active.group=row.group||newRow?.group||'';
    const titleField=/^personal-/.test(id)?`<label class="ce-title-field">Titre de ma section<input id="ce-section-title" maxlength="180" value="${esc(initial.title)}" placeholder="Un titre court et précis"></label>`:'';
    dialog.querySelector('.ce-dialog-body').innerHTML=titleField+toolbar()+`<div class="ce-editor-mount"></div><div class="ce-link-panel" hidden></div><p class="ce-error" role="alert" hidden></p><footer class="ce-editor-footer"><div><span id="ce-draft-status" role="status">${draft?'Brouillon retrouvé':'Modifie le texte ou sélectionne un passage à mettre en forme.'}</span><small>Modifications personnelles · Les cartes conservent leur correction d’origine.</small></div><div>${control('Annuler','unused').replace('data-ce="unused"','data-editor="cancel"')}<button type="button" class="btn" data-editor="save">Enregistrer</button></div></footer>`;
    editor=window.ATLAS_RICH_EDITOR.create(dialog.querySelector('.ce-editor-mount'),cleanHTML(window.ATLAS_COURSE_SEMANTICS.annotate(cleanHTML(initial.html),{personal:initial.semanticVersion===1})),()=>{
      active.changed=true;clearTimeout(timer);timer=setTimeout(saveDraft,500);status('Brouillon en cours…');refreshTools();
    },refreshTools);
    active.startHTML=editor.getHTML();
    const input=dialog.querySelector('#ce-section-title');
    input?.addEventListener('input',()=>{active.changed=true;clearTimeout(timer);timer=setTimeout(saveDraft,500);});
    refreshTools();
    (input||dialog.querySelector('.ce-prose')).focus({preventScroll:true});
  }
  function toolbar() {
    const tool=(label,action,html=label)=>`<button type="button" data-editor="${action}" data-command title="${label}" aria-label="${label}">${html}</button>`;
    const select=(label,options,name)=>`<label class="ce-select-label"><span>${label}</span><select aria-label="${label}" data-editor-select="${name}">${options.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>`;
    return `<div class="ce-toolbar" role="toolbar" aria-label="Mise en forme du cours">
      <div class="ce-tool-row">${select('Format',[['','Texte'],...[1,2,3,4,5,6].map(n=>['h'+n,'Titre '+n]),['bullet','Liste à puces'],['ordered','Liste numérotée'],['task','Liste à cocher'],['quote','Citation'],['details','Bloc repliable']],'format')}
      ${tool('Gras','bold','<b>G</b>')}${tool('Italique','italic','<i>I</i>')}${tool('Souligner','underline','<u>S</u>')}${tool('Barrer','strike','<s>B</s>')}${tool('Indice','subscript','x₂')}${tool('Exposant','superscript','x²')}
      ${tool('Annuler la dernière action','undo','↶')}${tool('Rétablir la dernière action','redo','↷')}</div>
      <div class="ce-tool-row ce-palette-row">${select('Texte',[['','Couleur du texte'],...PALETTE.filter(p=>!p[0].endsWith('_bg')).map(([v,l])=>[v,l]),['clear','Retirer la couleur']],'text')}
      ${select('Surlignage',[['','Surlignage'],...PALETTE.filter(p=>p[0].endsWith('_bg')).map(([v,l])=>[v,l]),['clear','Retirer le surlignage']],'highlight')}
      ${tool('Lien','link')}${tool('Insérer une image','image','Image')}${tool('Insérer un tableau','table','Tableau')}${tool('Ajouter un bloc repliable','details','Repliable')}
      ${tool('Augmenter le retrait','indent','⇥')}${tool('Diminuer le retrait','outdent','⇤')}${tool('Retirer la mise en forme','clear','Effacer le style')}</div>
      <details class="ce-block-menu"><summary>Organiser les blocs</summary><div>${tool('Monter le bloc','move-up','↑ Monter')}${tool('Descendre le bloc','move-down','↓ Descendre')}${tool('Dupliquer le bloc','duplicate','Dupliquer')}${tool('Supprimer le bloc','delete-block','Retirer le bloc')}</div></details>
      <div class="ce-table-tools" hidden>${tool('Ajouter une ligne','row','＋ Ligne')}${tool('Ajouter une colonne','column','＋ Colonne')}${tool('Supprimer la ligne','delete-row','− Ligne')}${tool('Supprimer la colonne','delete-column','− Colonne')}${tool('Fusionner les cellules','merge','Fusionner')}${tool('Séparer les cellules','split','Séparer')}${tool('Supprimer le tableau','delete-table','Retirer le tableau')}</div></div>`;
  }
  function refreshTools() {
    if(!editor||!dialog)return;
    for(const name of ['bold','italic','underline','strike','subscript','superscript'])dialog.querySelector(`[data-editor="${name}"]`)?.setAttribute('aria-pressed',String(editor.isActive(name)));
    dialog.querySelector('[data-editor="undo"]').disabled=!editor.can().undo();
    dialog.querySelector('[data-editor="redo"]').disabled=!editor.can().redo();
    dialog.querySelector('.ce-table-tools').hidden=!editor.isActive('table');
    for(const select of dialog.querySelectorAll('[data-editor-select]'))if(!select.onchange)select.onchange=()=>{const value=select.value;select.value='';format(select.dataset.editorSelect,value);};
  }
  function format(type,value) {
    if(!editor)return;
    const chain=editor.chain().focus();
    if(type==='format') {
      if(/^h[1-6]$/.test(value))chain.toggleHeading({level:+value.slice(1)}).run();
      else if(value==='bullet')chain.toggleBulletList().run();
      else if(value==='ordered')chain.toggleOrderedList().run();
      else if(value==='task')chain.toggleTaskList().run();
      else if(value==='quote')chain.toggleBlockquote().run();
      else if(value==='details')command('details');else chain.setParagraph().run();
    } else {
      if(!value)return;
      const mark=type==='highlight'?'courseHighlight':'courseColor';
      if(value==='clear')chain.unsetMark(mark).run();
      else chain.setMark(mark,{class:'nc-'+value}).run();
    }
  }
  function command(action) {
    if(action==='close'){if(close(true))context.render();return;}
    if(action==='cancel'){const next=clone();delete next.drafts[active.id];if(commit(next)){close(false);context.render();}return;}
    if(action==='save'){saveVersion();return;}
    if(action==='restore-original'){
      const next=clone();next.previous[active.id]=next.objectives[active.id];delete next.objectives[active.id];delete next.drafts[active.id];
      if(commit(next)){close(false);context.render();context.toast('Cours d’origine rétabli. Ta version reste récupérable.');}return;
    }
    if(!editor)return;
    const chain=editor.chain().focus();
    const commands={bold:'toggleBold',italic:'toggleItalic',underline:'toggleUnderline',strike:'toggleStrike',subscript:'toggleSubscript',superscript:'toggleSuperscript',undo:'undo',redo:'redo',row:'addRowAfter',column:'addColumnAfter','delete-row':'deleteRow','delete-column':'deleteColumn',merge:'mergeCells',split:'splitCell','delete-table':'deleteTable'};
    if(['move-up','move-down','duplicate','delete-block'].includes(action))window.ATLAS_RICH_EDITOR.block(editor,action);
    else if(commands[action])chain[commands[action]]().run();
    else if(action==='clear')chain.unsetAllMarks().run();
    else if(action==='table')chain.insertTable({rows:3,cols:2,withHeaderRow:true}).run();
    else if(action==='details')chain.insertContent('<details><summary>À retenir</summary><p>Ton contenu ici</p></details><p></p>').run();
    else if(action==='indent'||action==='outdent')chain[action==='indent'?'sinkListItem':'liftListItem'](editor.isActive('taskItem')?'taskItem':'listItem').run();
    else if(action==='link'||action==='image')urlPanel(action);
    refreshTools();
  }
  function urlPanel(type) {
    const panel=dialog.querySelector('.ce-link-panel');panel.hidden=false;
    panel.innerHTML=`<label>${type==='link'?'Adresse du lien':'Adresse HTTPS de l’image'}<input type="url" id="ce-url" placeholder="https://…" value="${type==='link'?esc(editor.getAttributes('link').href||''):''}"></label>${type==='image'?'<label>Description de l’image<input id="ce-alt" placeholder="Ce que montre l’image"></label>':''}<button type="button" class="btn small" id="ce-insert-url">Insérer</button>${type==='link'?'<button type="button" class="btn small secondary" id="ce-unlink">Retirer le lien</button>':''}<button type="button" class="btn small secondary" id="ce-cancel-url">Fermer</button>`;
    panel.querySelector('#ce-url').focus();
    panel.querySelector('#ce-cancel-url').onclick=()=>{panel.hidden=true;editor.commands.focus();};
    panel.querySelector('#ce-unlink')?.addEventListener('click',()=>{editor.chain().focus().extendMarkRange('link').unsetLink().run();panel.hidden=true;});
    panel.querySelector('#ce-insert-url').onclick=()=>{
      const url=panel.querySelector('#ce-url').value.trim();
      if(!(type==='image'?/^https:\/\//i:/^https?:\/\//i).test(url)){error('Saisis une adresse complète et valide.');return;}
      if(type==='image')editor.chain().focus().setImage({src:url,alt:panel.querySelector('#ce-alt').value}).run();
      else if(editor.state.selection.empty)editor.chain().focus().insertContent(`<a href="${esc(url)}">${esc(url)}</a>`).run();
      else editor.chain().focus().extendMarkRange('link').setLink({href:url}).run();
      panel.hidden=true;error('');
    };
  }
  function status(message){const el=dialog?.querySelector('#ce-draft-status');if(el)el.textContent=message;}
  function error(message){const el=dialog?.querySelector('.ce-error');if(el){el.hidden=!message;el.textContent=message;}}
  function entry() {
    const html=cleanHTML(editor.getHTML());
    if(html.length>MAX_HTML)throw Error('Cette section est trop longue. Répartis-la dans plusieurs sections.');
    return {html,title:dialog.querySelector('#ce-section-title')?.value.trim()||active.initial.title,
      group:active.group,item:context.item.numero,semanticVersion:1,updatedAt:new Date().toISOString()};
  }
  function saveDraft() {
    if(!editor||!active?.changed)return true;
    try { const next=clone();next.drafts[active.id]=entry();
      if(!commit(next)){error('Brouillon non enregistré : exporte ta progression ou libère du stockage avant de fermer.');return false;}
      status('Brouillon enregistré sur cet appareil');return true;
    } catch(e){error(e.message);return false;}
  }
  function saveVersion() {
    try {
      if(!editor)return;
      const row=entry();if(/^personal-/.test(active.id)&&!row.title){error('Donne un titre à cette section.');dialog.querySelector('#ce-section-title').focus();return;}
      const next=clone();delete next.drafts[active.id];
      if(/^personal-/.test(active.id)){
        const list=next.sections[context.item.numero]||=[];const index=list.findIndex(s=>s.id===active.id);
        const old=index<0?{}:list[index];const updated={...old,...row,id:active.id};
        if(index<0)list.push(updated);else list[index]=updated;
      }else if(active.changed){next.previous[active.id]=next.objectives[active.id]||null;next.objectives[active.id]=row;}
      if(!commit(next)){error('Enregistrement impossible. Ton texte reste ouvert ; réessaie après avoir libéré du stockage.');return;}
      const id=active.id;close(false);context.render();
      const target=document.getElementById(id)||document.getElementById('reading-'+id);
      if(target)target.open=true;
      context.toast('Version personnelle enregistrée.');
    }catch(e){error(e.message||'Enregistrement impossible.');}
  }
  function showOriginal(id) {
    if(dialog&&!close(true))return;
    const o=context.item.objectifs.find(o=>o.id===id);active={id,changed:false};
    createDialog('Cours d’origine');
    dialog.querySelector('.ce-dialog-body').innerHTML=`<p>Ta version personnelle est conservée. Tu peux revenir au cours source à tout moment.</p><div class="medical notion-course">${window.ATLAS_COURSE.sanitize(o.contenu)}</div><footer class="ce-editor-footer"><button type="button" class="btn secondary" data-editor="close">Garder ma version</button><button type="button" class="btn" data-editor="restore-original">Rétablir le cours d’origine</button></footer>`;
  }
  function close(keepDraft=true,force=false) {
    if(!dialog)return true;
    clearTimeout(timer);
    if(keepDraft&&!saveDraft()&&!force)return false;
    loadEpoch++;editor?.destroy();editor=null;dialog.close();dialog.remove();dialog=null;active=null;
    document.documentElement.classList.remove('ce-editing');previousFocus?.focus({preventScroll:true});return true;
  }
  window.addEventListener('beforeunload',e=>{if(editor&&active?.changed&&!saveDraft()){e.preventDefault();e.returnValue='';}});
  window.ATLAS_CUSTOM_COURSE={clean,cleanHTML,content,renderHTML,mount,legend,close,palette:PALETTE};
})();
