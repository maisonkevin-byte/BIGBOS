import { Editor, Node, Mark, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

// Preserve source containers and annotations instead of flattening the course.
const block = (name, tag, content = 'block*') => Node.create({
  name, group: 'block', content, defining: true,
  parseHTML: () => [{ tag }],
  renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0]
});
const Summary = Node.create({
  name: 'courseSummary', content: 'inline*', defining: true,
  parseHTML: () => [{ tag: 'summary' }],
  renderHTML: ({ HTMLAttributes }) => ['summary', HTMLAttributes, 0]
});
const Details = Node.create({
  name: 'courseDetails', group: 'block', content: 'courseSummary block+',
  defining: true, isolating: true,
  parseHTML: () => [{ tag: 'details' }],
  renderHTML: ({ HTMLAttributes }) => ['details', { ...HTMLAttributes, open: '' }, 0]
});
const annotation = (name, accept) => Mark.create({
  name, inclusive: false,
  addAttributes: () => ({ class: { default: null } }),
  parseHTML: () => ['span[class]','mark[class]'].map(tag=>({tag,consuming:false,
    getAttrs: el => {
      const classes=[...el.classList].filter(accept).join(' ');
      return classes?{class:classes}:false;
    }})),
  renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0]
});
const isColor = c => /^nc-(?:gray|brown|orange|yellow|green|blue|purple|pink|red)$/.test(c);
const isHighlight = c => /^nc-.*_bg$/.test(c);
const CourseStyle = annotation('courseStyle',c=>!isColor(c)&&!isHighlight(c));
const CourseColor = annotation('courseColor',isColor);
const CourseHighlight = annotation('courseHighlight',isHighlight);
const Classes = Extension.create({
  name: 'courseClasses',
  addGlobalAttributes: () => [{
    types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem',
      'blockquote', 'table', 'tableCell', 'tableHeader', 'tableRow', 'courseDiv',
      'courseFigure', 'courseCaption', 'courseSummary', 'courseDetails',
      'bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'link'],
    attributes: { class: { default: null, parseHTML: el => el.getAttribute('class') } }
  }]
});
window.ATLAS_RICH_EDITOR = {
  block(editor, action) {
    const {$from}=editor.state.selection;
    let depth=$from.depth;
    for(let d=depth;d>0;d--)if(['listItem','taskItem','table'].includes($from.node(d).type.name))depth=d;
    if(!depth)return false;
    const node=$from.node(depth), parent=$from.node(depth-1), index=$from.index(depth-1);
    const start=$from.before(depth), tr=editor.state.tr;
    if(action==='duplicate')tr.insert(start+node.nodeSize,node);
    else if(action==='delete-block')tr.delete(start,start+node.nodeSize);
    else {
      const up=action==='move-up', neighbor=parent.maybeChild(index+(up?-1:1));
      if(!neighbor)return false;
      const target=up?start-neighbor.nodeSize:start+neighbor.nodeSize;
      tr.delete(start,start+node.nodeSize).insert(target,node);
    }
    editor.view.dispatch(tr.scrollIntoView());editor.commands.focus();return true;
  },
  create(element, html, onUpdate, onSelectionUpdate) {
    return new Editor({
      element,
      extensions: [StarterKit.configure({ trailingNode: false, link: { openOnClick: false,
        protocols: ['https', 'http'], autolink: false }, heading: { levels: [1,2,3,4,5,6] } }),
        TableKit.configure({ table: { resizable: false } }),
        Image.configure({ allowBase64: false, inline: true }), TaskList, TaskItem.configure({ nested: true }),
        Subscript, Superscript, CourseStyle, CourseColor, CourseHighlight, Classes,
        block('courseDiv', 'div'), block('courseFigure', 'figure'),
        block('courseCaption', 'figcaption', 'inline*'), Summary, Details],
      content: html || '<p></p>',
      editorProps: {
        attributes: { class: 'medical notion-course ce-prose', role: 'textbox',
          'aria-label': 'Contenu de la section', 'aria-multiline': 'true', spellcheck: 'true' },
        transformPastedHTML: html => window.ATLAS_CUSTOM_COURSE.cleanHTML(html)
      },
      onUpdate, onSelectionUpdate
    });
  }
};
