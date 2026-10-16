/* Shared, lossless reading layout for all ATLAS course surfaces. */
(() => {
'use strict';
const sentences=typeof Intl.Segmenter==='function'?new Intl.Segmenter('fr',{granularity:'sentence'}):null;
// Presentation only: keep every source character, inline emphasis and link.
// Ranges split the existing HTML without rewriting clinical content.
function readableCourse(html){
 const template=document.createElement('template');template.innerHTML=html;
 const blockTags='p,ul,ol,table,h2,h3,h4,h5,figure,details,blockquote,div,pre,.course-notion';
 if(!template.content.querySelector(blockTags)&&template.content.textContent.trim()){
  const paragraph=document.createElement('p');paragraph.append(...template.content.childNodes);template.content.append(paragraph);
 }
 function slice(node,start,end){
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];let text;
  while((text=walker.nextNode()))texts.push(text);
  const locate=offset=>{
   let total=0;
   for(const text of texts){
    if(offset<total+text.length){
     let container=text,position=offset-total;
     // Use the outer boundary at the start of an inline element, avoiding
     // empty duplicate links/labels in the preceding fragment.
     while(position===0&&container!==node){const parent=container.parentNode;position=[...parent.childNodes].indexOf(container);container=parent;}
     return [container,position];
    }
    total+=text.length;
   }
   return [texts.at(-1),texts.at(-1).length];
  };
  const range=document.createRange();
  if(start===0)range.setStart(node,0);else range.setStart(...locate(start));
  if(end===node.textContent.length)range.setEnd(node,node.childNodes.length);else range.setEnd(...locate(end));
  let fragment=range.cloneContents(),ancestor=range.commonAncestorContainer;
  if(ancestor.nodeType===Node.TEXT_NODE)ancestor=ancestor.parentNode;
  // A Range wholly inside a colored span does not clone that span itself.
  // Restore its inline ancestry so the source highlighting stays attached.
  for(;ancestor!==node;ancestor=ancestor.parentNode){const wrapper=ancestor.cloneNode(false);wrapper.append(fragment);fragment=wrapper;}
  return fragment;
 }
 function block(node,tag,start,end,cls=''){
  const el=document.createElement(tag);if(cls)el.className=cls;el.append(slice(node,start,end));return el;
 }
 // This source has a long inline enumeration. Give its existing clauses
 // explicit paragraphs and bullets, retaining qualifiers and urgency notes.
 for(const note of template.content.querySelectorAll('.callout')){
  if(note.closest('table'))continue;
  const text=note.textContent,title=note.querySelector('strong');
  if(title?.textContent!=='Bilan sanguin per-critique')continue;
  const markers=['glycémie veineuse','insuline','ionogramme','cétonémie','lactate','GH','profil des acylcarnitines','sur la 1ʳᵉ miction','cétonurie','En cas de trouble de conscience','Après resucrage','Bilan minimal','écarter une','et un déficit'];
  let cursor=title.textContent.length;const offsets=markers.map(marker=>{const at=text.indexOf(marker,cursor);if(at>=0)cursor=at+marker.length;return at;});
  if(offsets.some(at=>at<0))continue; // A revised course keeps its own structure.
  const result=document.createDocumentFragment();
  result.append(block(note,'h5',0,title.textContent.length,'algo-course-subheading'),block(note,'p',title.textContent.length,offsets[0]));
  const list=document.createElement('ul');
  for(let i=0;i<7;i++)list.append(block(note,'li',offsets[i],offsets[i+1]));
  result.append(list,block(note,'p',offsets[7],offsets[8],'algo-course-subheading'));
  const urine=document.createElement('ul');urine.append(block(note,'li',offsets[8],offsets[9]));
  result.append(urine,block(note,'p',offsets[9],offsets[10],'algo-course-warning'),block(note,'p',offsets[10],offsets[11]),block(note,'p',offsets[11],offsets[12],'algo-course-subheading'));
  const missed=document.createElement('ul');missed.append(block(note,'li',offsets[12],offsets[13]),block(note,'li',offsets[13],text.length));result.append(missed);
  note.replaceChildren(result);
 }
 // Existing explicit line breaks already mark separate ideas in the source.
 // Promote these to paragraphs without guessing at clinical list boundaries.
 for(const node of template.content.querySelectorAll('p,li,.callout,.obj-callout')){
  if(node.closest('table')||node.querySelector(blockTags)||node.textContent.length<180)continue;
  const children=[...node.childNodes];if(!children.some(c=>c.nodeName==='BR'))continue;
  const result=document.createDocumentFragment();let start=0;
  for(let i=0;i<=children.length;i++)if(i===children.length||children[i].nodeName==='BR'){
   const range=document.createRange();range.setStart(node,start);range.setEnd(node,i);
   const p=document.createElement('p');p.className=node.tagName==='P'?node.className:'';p.append(range.cloneContents());if(p.childNodes.length)result.append(p);start=i+1;
  }
  if(node.tagName==='P')node.replaceWith(result);else node.replaceChildren(result);
 }
 for(const note of template.content.querySelectorAll('.callout,.obj-callout')){
  if(note.closest('table')||note.querySelector(blockTags))continue;
  const text=note.textContent;if(!text.trim())continue;
  const title=note.firstElementChild,hasTitle=title?.matches('strong,b')&&[...note.childNodes].find(n=>n.nodeType===1||n.textContent.trim())===title&&title.textContent.length<110;
  const start=hasTitle?text.indexOf(title.textContent)+title.textContent.length:0,result=document.createDocumentFragment();
  if(hasTitle)result.append(block(note,'h5',0,start,'algo-course-subheading'));
  if(start<text.length)result.append(block(note,'p',start,text.length));
  note.replaceChildren(result);
 }
 for(const paragraph of template.content.querySelectorAll('p')){
  if(paragraph.closest('table'))continue;
  const title=paragraph.firstElementChild;
  if(!title?.matches('strong,b')||paragraph.textContent.trimStart().indexOf(title.textContent)!==0)continue;
  if(title.textContent.length<95&&/:\s*$/.test(title.textContent))title.classList.add('course-inline-heading');
  if(paragraph.textContent.length>140)continue;
  const tail=paragraph.textContent.trim().slice(title.textContent.length).trim();
  if(tail&&!/^[:—–-][^.!?]{0,45}$/.test(tail))continue;
  const heading=document.createElement('h4');heading.className='course-subheading';heading.append(...paragraph.childNodes);paragraph.replaceWith(heading);
 }
 // Keep one clearly delimited notion per line, also inside table cells.
 // Commas, conjunctions, slashes and arrows are not semantic boundaries:
 // they may belong to a dose, a negation, a condition or a clinical relation.
 for(const node of template.content.querySelectorAll('p,li,td,th,blockquote,div')){
  if(node.closest('.course-notions,.source-note,pre,code')||node.querySelector(blockTags)||node.matches('.algo-course-subheading,.course-subheading'))continue;
  const text=node.textContent;if(!text.trim())continue;
  const protectedAt=new Set(),stack=[];
  const pairs={'(':')','[':']','{':'}','«':'»','“':'”'};
  for(let i=0;i<text.length;i++){
   if(pairs[text[i]])stack.push(pairs[text[i]]);
   else if(text[i]===stack.at(-1))stack.pop();
   if(stack.length)protectedAt.add(i+1);
  }
  const offsets=new Map();let offset=0;
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let child;
  while((child=walker.nextNode())){offsets.set(child,offset);offset+=child.length;}
  const elementOffset=el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),first=w.nextNode();return first?offsets.get(first):null;};
  // Never break a link or code fragment into several interactive elements.
  for(const el of node.querySelectorAll('a,code')){
   const start=elementOffset(el);if(start===null)continue;
   for(let i=start+1;i<start+el.textContent.length;i++)protectedAt.add(i);
  }
  const points=new Map([[0,'start'],[text.length,'end']]);
  const dependent=/^(?:mais|sauf|excepté(?:e)?s?|sinon|car|parce que|dont|y compris|si|en cas|à défaut|à condition|uniquement si|seulement si)(?=\s|$|[,:;])/i;
  function add(end,kind){
   if(end<=0||end>=text.length||protectedAt.has(end)||!text.slice(0,end).trim()||!text.slice(end).trim())return;
   if(kind!=='bullet'&&dependent.test(text.slice(end).trimStart()))return;
   points.set(end,kind);
  }
  for(const match of text.matchAll(/;\s*/g))add(match.index+match[0].length,'clause');
  for(const match of text.matchAll(/\s+(?=[•●▪]\s)/g))add(match.index+match[0].length,'bullet');
  const parts=sentences?[...sentences.segment(text)].map(s=>s.index+s.segment.length):[...text.matchAll(/[.!?]\s+(?=[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜ])/g)].map(m=>m.index+m[0].length);
  for(const end of parts){
   const before=text.slice(0,end).trimEnd();
   if(!/[.!?][»”')\]]*$/.test(before)||/(?:\b(?:M|Mme|Dr|Pr|etc|cf|fig|ex|env|vol|chap|art|réf)|\bp\.\s*ex|\b(?:[a-z]\.)+[a-z])\.\s*$/i.test(before))continue;
   add(end,'sentence');
  }
  // Existing bold labels ("Diagnostic :", "Traitement :") are explicit
  // structure even when the author did not add a paragraph or a semicolon.
  for(const label of node.querySelectorAll('strong,b')){
   if(label.textContent.length>80||!/:\s*$/.test(label.textContent))continue;
   const start=elementOffset(label);if(start===null||protectedAt.has(start))continue;
   const previous=text.slice(0,start).trimEnd();
   if(start===0||!previous){label.classList.add('course-inline-heading');continue;}
   if(/[;.!?•●▪]\s*$/.test(previous)||previous.length>=30){add(start,'label');label.classList.add('course-inline-heading');}
  }
  if(points.size<3)continue;
  const entries=[...points].sort((a,b)=>a[0]-b[0]),result=document.createDocumentFragment();
  for(let i=0;i<entries.length-1;i++)result.append(block(node,'span',entries[i][0],entries[i+1][0],'course-notion course-notion-'+entries[i][1]));
  node.classList.add('course-notions');node.replaceChildren(result);
 }
 // Let table columns use the course width while retaining horizontal scrolling
 // inside the table alone when its columns cannot fit a narrow screen.
 for(const table of template.content.querySelectorAll('table')){
  if(table.parentElement?.classList.contains('course-table-scroll'))continue;
  const wrapper=document.createElement('div');wrapper.className='course-table-scroll';
  wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Tableau du cours — défilement horizontal si nécessaire');
  table.replaceWith(wrapper);wrapper.append(table);
 }
 return template.innerHTML;
}
window.ATLAS_COURSE_READING={format:readableCourse};
})();
