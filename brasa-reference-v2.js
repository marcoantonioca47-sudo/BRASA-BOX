/* BRASABOX — composição visual fiel ao mockup */
(()=>{'use strict';
const img={
 burger:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=88',
 bacon:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=88',
 fries:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=88',
 coke:'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=700&q=88',
 steak:'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=88'
};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const srcFor=name=>{const n=norm(name);if(n.includes('batata'))return img.fries;if(n.includes('coca'))return img.coke;if(n.includes('bacon'))return img.bacon;if(n.includes('salada')||n.includes('egg')||n.includes('tud'))return img.burger;return img.burger};
function home(){
 const p=document.getElementById('page-inicio');if(!p||p.querySelector('.refHomeHeader'))return;
 const wrap=document.createElement('div');wrap.className='refHome';
 wrap.innerHTML='<div class="refHomeHeader"><img class="refHomeLogo" src="./bv-logo.png?v=20260929.1200" alt="BRASA BOX"><div class="refLocation"><span>⌖</span><div><small>Entrega em</small><b>Centro <span class="chev">⌄</span></b></div><span>›</span></div></div>'+
 '<div class="refPromo"><small>PROMOÇÃO IMPERDÍVEL</small><h3>2 X TUDO<br>+ 1 COCA 2L</h3><p>POR APENAS</p><strong>R$ 55,00</strong><div class="refPromoFood"></div></div>'+
 '<div class="refSectionHead"><h3>Categorias</h3><a onclick="showPage(\'cardapio\')">Ver todas ›</a></div>'+
 '<div class="refCategories"><button class="refCat" onclick="showPage(\'cardapio\')"><span>▱</span>Lanches</button><button class="refCat" onclick="showPage(\'cardapio\')"><span>♨</span>Porções</button><button class="refCat" onclick="showPage(\'cardapio\')"><span>🥤</span>Bebidas</button><button class="refCat" onclick="showPage(\'cardapio\')"><span>▣</span>Combos</button></div>'+
 '<div class="refSectionHead"><h3>Destaques</h3><a onclick="showPage(\'cardapio\')">Ver todos ›</a></div>'+
 '<div class="refHighlights">'+
 '<button class="refProduct" onclick="showPage(\'cardapio\')"><img src="'+img.burger+'" alt="X-Salada"><div class="refProductInfo"><b>X-Salada</b><strong>R$ 10,99</strong></div><span class="refAdd">+</span></button>'+
 '<button class="refProduct" onclick="showPage(\'cardapio\')"><img src="'+img.bacon+'" alt="X-Bacon"><div class="refProductInfo"><b>X-Bacon</b><strong>R$ 17,00</strong></div><span class="refAdd">+</span></button></div>'+
 '<div class="refHomeSpacer"></div>';
 p.insertBefore(wrap,p.firstElementChild);
}
function patchCards(){
 const root=document.getElementById('products');if(!root)return;
 root.querySelectorAll('.productCard').forEach(card=>{
   const h=card.querySelector('h3');if(!h)return;
   const name=h.textContent.trim();const src=srcFor(name);
   let box=card.querySelector('.productImage');
   if(!box)return;
   box.innerHTML='<img src="'+src+'" alt="'+name.replace(/"/g,'&quot;')+'" style="width:100%;height:100%;object-fit:cover;display:block">';
 });
}
function cartImages(){
 const root=document.getElementById('cart');if(!root)return;
 root.querySelectorAll('.cartItem').forEach(item=>{
   if(item.querySelector('.refCartThumb'))return;
   const name=item.querySelector('b,h4,strong')?.textContent||item.textContent;
   const im=document.createElement('img');im.className='refCartThumb';im.src=srcFor(name);im.alt='';
   item.insertBefore(im,item.firstChild);
 });
}
function boot(){
 home();
 patchCards();cartImages();
 new MutationObserver(()=>{patchCards();cartImages()}).observe(document.body,{subtree:true,childList:true});
 setTimeout(()=>{home();patchCards();cartImages()},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.BRASA_REFERENCE_IMAGES=img;
})();