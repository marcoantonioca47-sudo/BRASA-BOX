/* BRASABOX — acabamento final e experiência v1.3 — otimizado */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const draftKey='bv_checkout_draft_v1';
let draftTimer=0;
function injectStatus(){if($('bvStatusBar'))return;const d=document.createElement('div');d.id='bvStatusBar';d.className='bvStatusBar';d.innerHTML='<i class="bvStatusDot"></i><span id="bvStatusText">Conectado</span>';document.body.appendChild(d)}
function setOnline(v){const b=$('bvStatusBar'),t=$('bvStatusText');if(!b||!t)return;b.classList.toggle('offline',!v);b.classList.add('show');t.textContent=v?'Conexão restabelecida':'Você está offline — alterações serão preservadas';clearTimeout(b._hide);if(v)b._hide=setTimeout(()=>b.classList.remove('show'),2200)}
function saveDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{const ids=['name','phone','street','num','bairro','cep','comp','coupon','troco'];const d={mode:window.BV_MODE||'entrega',payment:localStorage.getItem('bv_payment')||'Pix'};ids.forEach(id=>{const e=$(id);if(e)d[id]=e.value});localStorage.setItem(draftKey,JSON.stringify(d))}catch(e){}},120)}
function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(!d)return;['name','phone','street','num','bairro','cep','comp','coupon','troco'].forEach(id=>{if($(id)&&d[id]!=null&&$(id).value==='')$(id).value=d[id]});if(d.payment){localStorage.setItem('bv_payment',d.payment);document.querySelectorAll('#page-pedido .pay button').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase().includes(d.payment.toLowerCase().replace('cartao','cart'))))}}catch(e){}}
function clearDraft(){try{localStorage.removeItem(draftKey)}catch(e){}}
function installSearch(){const page=$('page-cardapio'),tabs=page?.querySelector('.menuCategoryTabs');if(!page||!tabs||$('bvMenuTools'))return;const w=document.createElement('div');w.id='bvMenuTools';w.className='bvMenuTools';w.innerHTML='<input id="bvMenuSearch" class="bvMenuSearch" type="search" inputmode="search" placeholder="🔎 Buscar no cardápio..."><button id="bvMenuClear" class="bvMenuClear" type="button">Limpar</button>';tabs.insertAdjacentElement('afterend',w);$('bvMenuSearch').addEventListener('input',filterMenu);$('bvMenuClear').onclick=()=>{$('bvMenuSearch').value='';filterMenu()}}
function filterMenu(){const q=String($('bvMenuSearch')?.value||'').trim().toLowerCase();const grid=$('products');if(!grid)return;let found=0;grid.querySelectorAll('.productCard').forEach(card=>{const ok=!q||card.textContent.toLowerCase().includes(q);card.style.display=ok?'':'none';if(ok)found++});let e=$('bvEmptySearch');if(q&&!found){if(!e){e=document.createElement('div');e.id='bvEmptySearch';e.className='bvEmptySearch';e.innerHTML='<b>Nenhum item encontrado</b><span>Tente outro nome ou categoria.</span>';grid.appendChild(e)}}else e?.remove()}
function patchRender(){if(window.BV_FINAL_RENDER_PATCH)return;const old=window.renderProducts;if(typeof old!=='function')return;window.renderProducts=function(){const r=old.apply(this,arguments);setTimeout(filterMenu,0);return r};window.BV_FINAL_RENDER_PATCH=true}
function cartFloat(){if($('bvCartFloat'))return;const b=document.createElement('button');b.id='bvCartFloat';b.className='bvCartFloat';b.type='button';b.setAttribute('aria-label','Abrir meu pedido');b.innerHTML='<svg class="bvCartFloatIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 7H6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.5" fill="currentColor"/><circle cx="18" cy="20" r="1.5" fill="currentColor"/></svg><span id="bvCartFloatCount">0</span>';b.onclick=()=>window.showPage?.('pedido');document.body.appendChild(b);updateCartFloat()}
function updateCartFloat(){const role=String(window.BV_ROLE||'').toLowerCase();const login=$('login');const loginVisible=login&&getComputedStyle(login).display!=='none';const hideCart=loginVisible||['administrador','admin','motoboy'].includes(role);const f=$('bvCartFloat');if(f)f.style.display=hideCart?'none':'';const n=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);if($('bvCartFloatCount'))$('bvCartFloatCount').textContent=n}
function patchCart(){
 if(window.BV_FINAL_CART_EVENT)return;
 document.addEventListener('bv:cart-updated',updateCartFloat);
 window.BV_FINAL_CART_EVENT=true;
 updateCartFloat();
}
function patchLogout(){if(window.BV_FINAL_LOGOUT_PATCH)return;const old=window.logout;if(typeof old!=='function')return;window.logout=async function(){try{localStorage.removeItem('bv_first_login_done');localStorage.removeItem('bv_checkout_draft_v1')}catch(e){}return old.apply(this,arguments)};window.BV_FINAL_LOGOUT_PATCH=true}
function dashboardTools(){const p=$('page-dashboard');if(!p||$('bvDashboardRefresh'))return;const h=p.querySelector('.adminTopActions');if(!h)return;const b=document.createElement('button');b.id='bvDashboardRefresh';b.type='button';b.textContent='↻ Atualizar';b.onclick=async()=>{b.disabled=true;b.textContent='Atualizando...';try{await window.BV_REFRESH_ORDERS?.();window.renderDashboard?.();window.renderAnalytics?.(true)}finally{b.disabled=false;b.textContent='↻ Atualizar'}};h.prepend(b)}

/* Dashboard: exibe sempre o item comprado, nunca a representação [object Object].
   A rotina principal já carrega os itens de order_items; aqui apenas normalizamos a
   apresentação do Dashboard, sem alterar os dados nem o restante do fluxo. */
function dashboardItemName(v){
  if(v==null)return '';
  if(typeof v==='string'||typeof v==='number')return String(v);
  if(Array.isArray(v))return v.map(dashboardItemName).filter(Boolean).join(', ');
  if(typeof v==='object'){
    const direct=v.product_name??v.productName??v.name??v.title??v.label;
    if(direct!=null&&typeof direct!=='object')return String(direct);
    const nested=v.product??v.item??v.data;
    if(nested&&nested!==v){const n=dashboardItemName(nested);if(n)return n;}
    return '';
  }
  return '';
}
function dashboardItemsText(order){
  const raw=order?.items;
  if(Array.isArray(raw)){
    const parts=raw.map(item=>{
      if(item==null)return '';
      if(typeof item==='string'||typeof item==='number')return String(item);
      const qty=Number(item.quantity??item.qty??item.q??1)||1;
      const name=dashboardItemName(item);
      return name?(qty+'x '+name):'';
    }).filter(Boolean);
    if(parts.length)return parts.join(', ');
  }
  if(raw&&typeof raw==='object'){
    const name=dashboardItemName(raw);
    if(name)return name;
  }
  const fallback=order?.items_text??order?.itemsText??order?.order_items_text;
  return fallback&&typeof fallback!=='object'?String(fallback):'Nenhum item informado';
}
function patchDashboardItems(){
  if(window.BV_DASHBOARD_ITEMS_PATCH)return;
  const old=window.renderDashboard;
  if(typeof old!=='function')return;
  window.renderDashboard=function(){
    const result=old.apply(this,arguments);
    setTimeout(()=>{
      const list=$('dashboardOrders');
      if(!list)return;
      const orders=(window.orders||[]).filter(o=>String(o?.rawStatus||o?.status||'').toLowerCase().replace(/\s+/g,'_')==='entregue').slice(0,20);
      list.querySelectorAll('.dashboardOrderLine').forEach((row,index)=>{
        const target=row.querySelector('.dashboardOrderMain small:not(.dashboardOrderDate)');
        const text=dashboardItemsText(orders[index]);
        if(target)target.textContent=text;
      });
    },0);
    return result;
  };
  window.BV_DASHBOARD_ITEMS_PATCH=true;
}
function patchShowPage(){if(window.BV_FINAL_SHOW_PAGE_PATCH)return;const old=window.showPage;if(typeof old!=='function')return;window.showPage=function(){const r=old.apply(this,arguments);updateCartFloat();return r};window.BV_FINAL_SHOW_PAGE_PATCH=true}
function boot(){injectStatus();installSearch();cartFloat();restoreDraft();dashboardTools();patchRender();patchCart();patchLogout();patchShowPage();setOnline(navigator.onLine);document.querySelectorAll('#page-pedido input,#page-pedido textarea').forEach(e=>e.addEventListener('input',saveDraft));window.addEventListener('online',()=>setOnline(true));window.addEventListener('offline',()=>setOnline(false));updateCartFloat()}
document.addEventListener('DOMContentLoaded',boot,{once:true});
})();