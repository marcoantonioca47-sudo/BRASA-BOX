/* BRASABOX — REFri MINI v2 — estoque exclusivamente por sabor */
(()=>{'use strict';
const MINI=[
 {key:'coca',label:'Coca',emoji:'🥤'},
 {key:'pepsi',label:'Pepsi',emoji:'🥤'},
 {key:'guarana',label:'Guaraná',emoji:'🥤'},
 {key:'laranja',label:'Laranja',emoji:'🍊'}
];
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const mini=p=>norm(p?.name)==='refri mini';
const db=()=>window.BV_SUPABASE||window.sb;
const say=m=>{const t=$('toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}else alert(m)};
const pid=p=>String(p?.id||'');
const key=(id,fl)=>id+'::'+norm(fl);
const stockOf=(id,fl)=>Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[key(id,fl)]??0));

async function loadMiniStocks(){
 const b=db(), products=window.products||[];
 const miniProduct=products.find(mini);
 const refri2=products.find(p=>norm(p?.name)==='refri 2l');
 if(!b)return false;
 try{
  const ids=[miniProduct?.id,refri2?.id].filter(Boolean);
  if(!ids.length)return false;
  const r=await b.from('product_flavor_stock').select('product_id,flavor,stock').in('product_id',ids);
  if(r.error)throw r.error;
  const s={...(window.BV_FLAVOR_STOCKS||{})};
  if(miniProduct)MINI.forEach(f=>s[key(miniProduct.id,f.key)]=0);
  if(refri2){
    s[key(refri2.id,'guarana')]=0;
    s[key(refri2.id,'laranja')]=0;
  }
  (r.data||[]).forEach(x=>{
    const flavor=norm(x.flavor);
    if(miniProduct){
      const f=MINI.find(y=>norm(y.label)===flavor);
      if(f)s[key(miniProduct.id,f.key)]=Math.max(0,Number(x.stock)||0);
    }
    if(refri2 && (flavor==='guarana'||flavor==='laranja')){
      s[key(refri2.id,flavor)]=Math.max(0,Number(x.stock)||0);
    }
  });
  window.BV_FLAVOR_STOCKS=s;
  return true;
 }catch(e){console.error('[BV FLAVOR STOCKS]',e);say('Não foi possível carregar os estoques dos sabores.');return false}
}
window.BV_REFRESH_FLAVOR_STOCKS=loadMiniStocks;

window.adjustProductFlavorStock=async(id,flavor,delta)=>{
 const p=(window.products||[]).find(x=>String(x.id)===String(id));
 const b=db();
 if(!p||!b)return null;
 const role=String(window.BV_ROLE||'').trim().toLowerCase();
 if(!['administrador','admin'].includes(role)){say('Acesso restrito ao administrador.');return null;}
 const flavorNorm=norm(flavor);
 const isMini=mini(p);
 const is2L=norm(p.name)==='refri 2l';
 const allowed=isMini?MINI.map(x=>norm(x.label)):['guarana','laranja'];
 if(!allowed.includes(flavorNorm)){say('Sabor inválido.');return null;}
 const canonical=isMini?(MINI.find(x=>norm(x.label)===flavorNorm)?.label||flavor):(flavorNorm==='guarana'?'Guaraná':'Laranja');
 try{
  const r=await b.rpc('adjust_product_flavor_stock',{p_product_id:id,p_flavor:canonical,p_delta:Number(delta)||0});
  if(r.error)throw r.error;
  const n=Math.max(0,Number(r.data)||0);
  window.BV_FLAVOR_STOCKS=window.BV_FLAVOR_STOCKS||{};
  window.BV_FLAVOR_STOCKS[key(id,flavorNorm)]=n;
  if(isMini)renderAdminMini();
  else if(is2L){
    const cards=document.querySelectorAll('#manage .adminProductCard');
    cards.forEach(card=>{
      if(norm(card.querySelector('h3')?.textContent)!=='refri 2l')return;
      const rows=card.querySelectorAll('.adminStockControls');
      const idx=flavorNorm==='guarana'?0:1;
      const row=rows[idx];
      if(row)row.querySelector('strong').textContent=String(n);
    });
    window.renderProducts?.();
  }
  say(canonical+' atualizado: '+n);
  return n;
 }catch(e){console.error('[BV FLAVOR STOCK]',e);say('Erro ao atualizar '+canonical+'.');return null}
};


function renderAdminMini(){
 const p=(window.products||[]).find(mini);if(!p)return;
 document.querySelectorAll('#manage .adminProductCard').forEach(card=>{
  if(norm(card.querySelector('h3')?.textContent)!=='refri mini')return;
  card.querySelectorAll('.catalogStock,.adminStockBox,.stockControl,.stockControls,[class*="stockControl"]').forEach(x=>{if(!x.classList.contains('bvMiniOnly'))x.style.display='none'});
  let box=card.querySelector('.bvMiniOnly');
  if(!box){box=document.createElement('div');box.className='bvMiniOnly';const info=card.querySelector('.productInfo')||card;info.appendChild(box)}
  box.innerHTML='<b>ESTOQUE POR SABOR</b>'+MINI.map(f=>'<div class="bvMiniRow"><span>'+f.emoji+' '+f.label+'</span><button type="button" data-d="-1" data-f="'+f.label+'">−</button><strong>'+stockOf(p.id,f.key)+'</strong><button type="button" data-d="1" data-f="'+f.label+'">+</button></div>').join('');
  box.querySelectorAll('button').forEach(btn=>btn.addEventListener('pointerdown',async e=>{
 e.preventDefault(); if(btn.dataset.busy==='1')return; btn.dataset.busy='1';
 const result=await window.adjustProductFlavorStock(p.id,btn.dataset.f,Number(btn.dataset.d));
 btn.dataset.busy='0'; if(result!==null)btn.blur();
}));
 });
}
window.renderProductsAdmin=(()=>{const old=window.renderProductsAdmin;return async()=>{if(typeof old==='function')await old();await loadMiniStocks();renderAdminMini()}})();

window.addToCart=(()=>{const old=window.addToCart;return id=>{const p=(window.products||[]).find(x=>String(x.id)===String(id));if(!mini(p))return old?.(id);openPicker(p)}})();

async function openPicker(p){
 await loadMiniStocks();
 let m=$('bvMiniPicker');
 if(!m){m=document.createElement('div');m.id='bvMiniPicker';m.className='bvMiniPicker';m.innerHTML='<div class="bvMiniPickerBox"><button class="bvMiniClose" type="button">×</button><h3>Refri Mini</h3><p>Escolha o sabor</p><div class="bvMiniChoices"></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});m.querySelector('.bvMiniClose').onclick=()=>m.classList.remove('show')}
 m.dataset.id=p.id;
 const box=m.querySelector('.bvMiniChoices');
 box.innerHTML=MINI.map(f=>{const n=stockOf(p.id,f.key);return '<button type="button" data-f="'+f.label+'" '+(n<1?'disabled':'')+'>'+f.emoji+' '+f.label+' <small>'+n+' disponíveis</small></button>'}).join('');
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>addFlavor(p,b.dataset.f));
 m.classList.add('show');
}
async function addFlavor(p,flavor){
 await loadMiniStocks();const f=MINI.find(x=>norm(x.label)===norm(flavor));if(!f)return;
 const n=stockOf(p.id,f.key);if(n<1)return say('Este sabor está esgotado.');
 window.cart=window.cart||[];
 const id=p.id+'::'+f.key;const old=window.cart.find(x=>String(x.id)===id);
 if(old&&Number(old.q)>=n)return say('Estoque máximo disponível.');
 if(old)old.q++;else window.cart.push({id,productId:p.id,name:p.name+' — '+f.label,price:Number(p.price)||0,q:1,category:p.category||'Bebidas',flavor:f.label});
 localStorage.setItem('bv_cart',JSON.stringify(window.cart));document.getElementById('count')?.replaceChildren(String(window.cart.reduce((a,x)=>a+Number(x.q||0),0)));window.renderCart?.();$('bvMiniPicker')?.classList.remove('show');
}
const oldChange=window.change;
window.change=async(id,d)=>{
 const item=(window.cart||[]).find(x=>String(x.id)===String(id));
 if(!item?.productId)return oldChange?.(id,d);
 const p=(window.products||[]).find(x=>String(x.id)===String(item.productId));
 if(!mini(p))return oldChange?.(id,d);
 const n=stockOf(p.id,item.flavor);if(d>0&&Number(item.q)>=n)return say('Estoque máximo disponível.');
 item.q=Number(item.q||0)+Number(d);if(item.q<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));
 localStorage.setItem('bv_cart',JSON.stringify(window.cart));window.renderCart?.();
};

function refreshMiniCatalogUI(){
 const products=window.products||[];
 const miniProduct=products.find(mini);
 const refri2=products.find(p=>norm(p?.name)==='refri 2l');
 document.querySelectorAll('#products .productCard').forEach(card=>{
  const name=norm(card.querySelector('h3')?.textContent);
  if(name==='refri mini' && miniProduct){
   const hasStock=MINI.some(f=>stockOf(miniProduct.id,f.key)>0);
   card.classList.toggle('productOutOfStock',!hasStock);
   card.querySelectorAll('.catalogStock,.stockControl,[class*="stockControl"],[class*="stockBadge"],[class*="stockInfo"],[data-stock]').forEach(x=>x.style.display='none');
   /* Não mostrar quantidade/estoque no card público da Coca-Cola 2L; o estoque continua sendo usado para bloquear a venda. */
   card.querySelectorAll('*').forEach(x=>{
    if(x===card || x.children.length>0)return;
    const t=norm(x.textContent);
    if(t.includes('estoque') || /^\\d+\\s*(disponiveis|disponíveis|unidades)$/.test(t))x.style.display='none';
   });
   let box=card.querySelector('.bvMiniCatalog');
   if(!box){box=document.createElement('div');box.className='bvMiniCatalog';card.querySelector('.productInfo')?.appendChild(box)}
   box.innerHTML='';
   const btn=card.querySelector('.productBottom button');
   if(btn){btn.disabled=!hasStock;btn.className=hasStock?'':'addDisabled';btn.textContent=hasStock?'+ Adicionar':'Esgotado';btn.onclick=hasStock?()=>openPicker(miniProduct):null;}
  }
  if(name==='refri 2l' && refri2){
   const hasStock=stockOf(refri2.id,'guarana')>0 || stockOf(refri2.id,'laranja')>0;
   card.classList.toggle('productOutOfStock',!hasStock);
   card.querySelectorAll('.catalogStock,.stockControl,[class*="stockControl"]').forEach(x=>x.style.display='none');
   const btn=card.querySelector('.productBottom button');
   if(btn){btn.disabled=!hasStock;btn.className=hasStock?'':'addDisabled';btn.textContent=hasStock?'+ Adicionar':'Esgotado';btn.onclick=hasStock?()=>window.BV_OPEN_FLAVOR_PICKER?.(refri2.id):null;}
  }
 });
}
window.BV_REFRESH_MINI_CATALOG_UI=refreshMiniCatalogUI;

/* Imagens definitivas dos cards de 2L — aplicadas depois de todos os renderizadores. */
window.BV_APPLY_2L_IMAGES=()=>{
  const cards=document.querySelectorAll('#products .productCard');
  cards.forEach(card=>{
    const title=norm(card.querySelector('h3')?.textContent||'');
    const isCoca=/^coca\s*-?\s*cola\s*2\s*(l|litros?)$/.test(title);
    const isRefri=/^refri\s*2\s*(l|litros?)$/.test(title);
    if(!isCoca&&!isRefri)return;
    const media=card.querySelector('.productImage');
    if(!media)return;
    const img=media.querySelector('img');
    const src=isCoca
      ? 'https://andinacocacola.vtexassets.com/arquivos/ids/158758-800-auto?aspect=true&height=auto&v=639156020671730000&width=800'
      : 'assets/refri-2l-sem-marca.svg';
    if(img){
      if(img.getAttribute('src')!==src)img.setAttribute('src',src);
      img.alt=isCoca?'Coca-Cola 2 litros':'Refrigerante 2 litros sem marca';
      img.style.display='block';
    }else{
      media.innerHTML='<img src="'+src+'" alt="'+(isCoca?'Coca-Cola 2 litros':'Refrigerante 2 litros sem marca')+'" loading="eager" decoding="async" style="display:block;width:100%;height:100%;object-fit:contain">';
    }
    media.querySelectorAll('span').forEach(s=>s.style.display='none');
  });
};
const bv2LObserver=new MutationObserver(()=>window.BV_APPLY_2L_IMAGES?.());
if(document.body)bv2LObserver.observe(document.body,{subtree:true,childList:true});
setTimeout(()=>window.BV_APPLY_2L_IMAGES?.(),50);
setTimeout(()=>window.BV_APPLY_2L_IMAGES?.(),500);


const oldRender=window.renderProducts;
if(typeof oldRender==='function'){
 window.renderProducts=async function(){
  const result=await oldRender.apply(this,arguments);
  refreshMiniCatalogUI();
  return result;
 };
}

const st=document.createElement('style');st.id='bvMiniV2Style';st.textContent='#products .flavorStock,#products .flavorStockGrid,#products .flavorStockItem{display:none!important}.bvMiniOnly,.bvMiniCatalog{margin-top:10px;padding:10px;border-radius:12px;background:rgba(0,0,0,.28)}.productBottom button:not(.addDisabled){background:var(--primary,#e50914)!important;color:#fff!important;border:0!important;opacity:1!important;filter:none!important;box-shadow:none!important}.productBottom button:not(.addDisabled):active{transform:scale(.98);filter:brightness(.92)!important}.bvMiniRow{display:grid;grid-template-columns:1fr 38px 42px 38px;align-items:center;gap:6px;margin-top:7px}.bvMiniRow button{min-height:34px;border:0;border-radius:8px;font-size:18px;font-weight:800;cursor:pointer;background:var(--primary,#e11);color:#fff;padding:0 12px;transition:transform .08s,filter .08s}.bvMiniRow button:active{transform:scale(.94);filter:brightness(.9)}.bvMiniRow button:disabled{opacity:.65}.bvMiniRow strong{text-align:center}.bvMiniCatalog{display:grid;grid-template-columns:1fr 1fr;gap:5px}.bvMiniCatalog b{grid-column:1/-1}.bvMiniPicker{position:fixed;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:99999;padding:18px}.bvMiniPicker.show{display:flex}.bvMiniPickerBox{width:min(420px,100%);padding:20px;border-radius:18px;background:#171717;color:#fff}.bvMiniClose{float:right;border:0;background:none;color:#fff;font-size:28px}.bvMiniChoices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bvMiniChoices button{padding:14px;border:0;border-radius:12px;font-weight:800}.bvMiniChoices small{display:block;margin-top:4px;opacity:.7}@media(max-width:600px){.bvMiniChoices{grid-template-columns:1fr 1fr}}';
document.head.appendChild(st);
window.BV_REFRI_FLAVORS_VERSION='2026.09.26.1010';
})();