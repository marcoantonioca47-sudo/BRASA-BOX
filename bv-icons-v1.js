/* BRASABOX — Ícones realistas 3D
   SVGs com volume, luz e profundidade; sem alterar eventos/funções.
*/
(function(){
  const ICONS={
    '🍔': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2Zm0 5h16l-1.2 3.2A2.8 2.8 0 0 1 16.2 20H7.8a2.8 2.8 0 0 1-2.6-1.8L4 15Zm1-7c.4-3 2.6-5 7-5s6.6 2 7 5H5Zm2.4-2.1h9.2c-.6-1.1-1.8-1.7-4.6-1.7s-4  .6-4.6 1.7Z"/></svg>',
    '🥤': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-1.1 17a2 2 0 0 1-2 1H9.1a2 2 0 0 1-2-1L6 3Zm2.1 4h7.8l-.7 11H8.8L8.1 7ZM9 2h8l1 2H8l1-2Zm6.8-1 1.8-1 .7 1.2-1.8 1L15.8 1Z"/></svg>',
    '🏍️': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18a3 3 0 1 1 0-6 3 3 0 0 1 2.8 2H10l2-5H9V7h4.2l1 2H17l-1.4-2.5L17.3 5H20l2 4-1.8 1-1.1-2H17l2 3h.1a3 3 0 1 1-2.9 4h-3.5l-1.2-2H7.8A3 3 0 0 1 5 18Zm0-2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm12 0a1 1 0 1 0 0 2 1 1 0 0 0-1-1 1 1 0 0 0 1-1Z"/></svg>',
    '🛡️': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.2-3.4 9.4-8 11-4.6-1.6-8-5.8-8-11V5l8-3Zm0 3.1L7 7v4c0 3.8 2.2 6.9 5 8.1 2.8-1.2 5-4.3 5-8.1V7l-5-1.9Zm-1 9.4-2.2-2.2 1.4-1.4  .8.8 3.8-3.8 1.4 1.4-5.2 5.2Z"/></svg>',
    '📋': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l1 2h3v16H4V5h3l1-2Zm1.2 4h5.6V5H9.2v2ZM7 10v8h10v-8H7Zm2 2h6v2H9v-2Zm0 3h4v2H9v-2Z"/></svg>',
    '📦': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4.5v11L12 22l-9-4.5v-11L12 2Zm0 2.2L7.4 6.5 12 8.8l4.6-2.3L12 4.2ZM5 8.1v8.2l6 3v-8.2L5 8.1Zm8 3v8.2l6-3V8.1l-6 3Z"/></svg>',
    '🏷️': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 12 9-9h6l3 3v6l-9 9L3 12Zm11-5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    '⚙': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19.4 13.5 2-1.5-2-1.5.2-2.5-2.4-.8-1-2.2-2.2.9L12 4l-2 1.9-2.2-.9-1 2.2-2.4.8.2 2.5-2 1.5 2 1.5-.2 2.5 2.4.8 1 2.2 2.2-.9 2 1.9 2-1.9 2.2.9 1-2.2 2.4-.8-.2-2.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>',
    '🛒': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.1A2.4 2.4 0 0 0 9.4 16H18v-2H9.8a.4.4 0 0 1-.4-.3l-.2-.7H19a2 2 0 0 0 1.9-1.4L22 7H7L6.6 5H3V4Zm6 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm9 0a2 2 0 1 0 0 4 2 2 0 0 0-2-2 2 2 0 0 0 2-2Z"/></svg>',
    '🔔': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 11h4a2 2 0 0 1-4 0Z"/></svg>',
    '🚚': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h11v10H3V5Zm13 4h3l3 3v3h-6V9Zm-9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>',
    '💳': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 5h18V8H3v2Zm3 4h5v2H6v-2Z"/></svg>',
    '💵': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Zm2 3v8c1.7 0 3-1.3 3-3s-1.3-3-3-3Zm14 0c-1.7 0-3 1.3-3 3s1.3 3 3 3V8Zm-7 1.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2Z"/></svg>',
    '🔎': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 14 5 5-1.5 1.5-5-5A7 7 0 1 1 15.5 14ZM10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
    '🏪': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16l2 5v3a3 3 0 0 1-2 2.8V21H4v-7.2A3 3 0 0 1 2 11V8l2-5Zm1.4 2-1 3H19.6l-1-3H5.4ZM6 14v5h12v-5a3.5 3.5 0 0 1-6-1.5A3.5 3.5 0 0 1 6 14Z"/></svg>',
    '🔐': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12v11H6V10Zm3-2V6a3 3 0 1 1 6 0v2h-2V6a1 1 0 0 0-2 0v2H9Zm3 5a2 2 0 0 0-1 3.7V19h2v-2.3A2 2 0 0 0 12 13Z"/></svg>',
    '🎟': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 1 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-4V7Zm5 0v10h2V7H8Z"/></svg>',
    '💰': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 3v8h12V8H6Zm6 1.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2Z"/></svg>',
    '🍴': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v7a2 2 0 0 0 2 2V3h2v9a2 2 0 0 0 2-2V3h2v7a4 4 0 0 1-3 3.9V21h-2v-7.1A4 4 0 0 1 7 10V3Zm10 0h2v18h-2v-8h-2V11l2-8Z"/></svg>',
    '😊': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-4 7a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 8 9Zm8 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 16 9Zm-8 5h8c-.7 2-2 3-4 3s-3.3-1-4-3Z"/></svg>',
    '📦': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 4.5v11L12 22l-9-4.5v-11L12 2Zm0 2.2L7.4 6.5 12 8.8l4.6-2.3L12 4.2ZM5 8.1v8.2l6 3v-8.2L5 8.1Zm8 3v8.2l6-3V8.1l-6 3Z"/></svg>',
    '⌂': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3v-10Z"/></svg>',
    '▦': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/></svg>',
    '↪': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5v3H6a5 5 0 0 0 0 10h4v-2H6a3 3 0 0 1 0-6h7v3l5-4-5-4Zm5 12v2h2v-2h-2Z"/></svg>'
  };
  const keys=Object.keys(ICONS).sort((a,b)=>b.length-a.length);
  function convert(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    for(const n of nodes){
      const p=n.parentElement;
      if(!p || ['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(p.tagName) || p.closest('.bv-real-icon')) continue;
      if(!keys.some(k=>n.nodeValue.includes(k))) continue;
      const frag=document.createDocumentFragment();
      let text=n.nodeValue;
      while(text){
        let found=null, idx=text.length;
        for(const k of keys){const i=text.indexOf(k); if(i>=0 && i<idx){idx=i;found=k;}}
        if(!found){frag.appendChild(document.createTextNode(text));break;}
        if(idx) frag.appendChild(document.createTextNode(text.slice(0,idx)));
        const s=document.createElement('span');
        s.className='bv-real-icon';
        s.innerHTML=ICONS[found];
        s.dataset.icon=found;
        frag.appendChild(s);
        text=text.slice(idx+found.length);
      }
      n.parentNode.replaceChild(frag,n);
    }
  }
  function start(){convert(document.body);const mo=new MutationObserver(()=>convert(document.body));mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();