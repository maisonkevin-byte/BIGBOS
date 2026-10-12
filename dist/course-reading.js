/* Shared, lossless reading layout for all ATLAS course surfaces. */
(() => {
'use strict';
const sentences=typeof Intl.Segmenter==='function'?new Intl.Segmenter('fr',{granularity:'sentence'}):null;
// Presentation only: keep every source character, inline emphasis and link.
// Ranges split the existing HTML without rewriting clinical content.
function readableCourse(html){
 const template=document.createElement('template');template.innerHTML=html;
 const blockTags='p,ul,ol,table,h2,h3,h4,h5,figure,details,blockquote,div,pre';
 function slice(node,start,end){
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];let text;
  while((text=walker.nextNode()))texts.push(text);
  const locate=(offset,isEnd=false)=>{let total=0;for(const text of texts){if(offset<total+text.length||(isEnd&&offset===total+text.length))return [text,offset-total];total+=text.length;}return [texts.at(-1),texts.at(-1).length];};
  const range=document.createRange();range.setStart(...locate(start));range.setEnd(...locate(end,true));return range.cloneContents();
 }
 function block(node,tag,start,end,cls=''){
  const el=document.createElement(tag);if(cls)el.className=cls;el.append(slice(node,start,end));return el;
 }
 function cuts(text,start=0){
  const result=[start];let previous=start;
  const parts=sentences?[...sentences.segment(text.slice(start))].map(part=>start+part.index+part.segment.length):[...text.slice(start).matchAll(/[.!?]\s+(?=[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜ])/g)].map(match=>start+match.index+match[0].length);
  for(const end of parts){
   if(end-previous>=100&&text.length-end>=55){result.push(end);previous=end;}
  }
  result.push(text.length);return [...new Set(result)];
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
  const start=hasTitle?text.indexOf(title.textContent)+title.textContent.length:0,points=cuts(text,start),result=document.createDocumentFragment();
  if(hasTitle)result.append(block(note,'h5',0,start,'algo-course-subheading'));
  for(let i=0;i<points.length-1;i++)if(points[i]<points[i+1])result.append(block(note,'p',points[i],points[i+1]));
  note.replaceChildren(result);
 }
 for(const paragraph of template.content.querySelectorAll('p,li')){
  if(paragraph.closest('table')||paragraph.matches('.source-note,.algo-course-subheading')||paragraph.querySelector(blockTags)||paragraph.textContent.length<320)continue;
  const points=cuts(paragraph.textContent);if(points.length<3)continue;
  const result=document.createDocumentFragment();
  for(let i=0;i<points.length-1;i++)result.append(block(paragraph,'p',points[i],points[i+1],paragraph.tagName==='P'?paragraph.className:''));
  if(paragraph.tagName==='P')paragraph.replaceWith(result);else paragraph.replaceChildren(result);
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
 return template.innerHTML;
}
window.ATLAS_COURSE_READING={format:readableCourse};
})();
