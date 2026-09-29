/* BRASABOX — CONTROLE DE ACESSO MOTOBOY v2 */
(()=>{'use strict';
const VERSION='2026.09.26.800';window.BV_ACCESS_VERSION=VERSION;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const roleNorm=v=>{const r=norm(v);if(['motoboy','moto boy','moto'].includes(r))return'motoboy';if(['administrador','admin','administrador geral'].includes(r))return'administrador';return r||'usuario'};
const isMoto=()=>roleNorm(window.BV_ROLE)==='motoboy',allowed=new Set(['pedidos','taxa-entrega']),$=id=>document.getElementById(id);
const pageName=el=>String(el?.id||'').replace(/^page-/,'');
function display(el,show){if(!el)return;const v=show?'':'none';if(el.style.display!==v)el.style.setProperty('display',v,'important')}
function enforce(){
 if(!isMoto())return;window.BV_ROLE='motoboy';
 document.querySelectorAll('.sideNav [data-page]').forEach(el=>{const p=String(el.dataset.page||''),m=el.matches('[data-role="motoboyOnly"]'),a=el.classList.contains('adminOnly')||el.classList.contains('adminDeliveryFeeLink')||el.dataset.role==='adminOnly';display(el,allowed.has(p)&&m&&!a)});
 document.querySelectorAll('.sideNav .navTitle,.sideBottom .adminBtn,.adminOnly,.adminDeliveryFeeLink').forEach(el=>display(el,false));
 document.querySelectorAll('.cartTop,.floatingCart,.bv-floating-cart,#floatingCart,[class*="floatingCart"],[id*="floatingCart"]').forEach(el=>display(el,false));
 document.querySelectorAll('.page').forEach(el=>display(el,allowed.has(pageName(el))));
 let active=document.querySelector('.page.activePage');
 if(!active||!allowed.has(pageName(active))){active=$('page-pedidos');document.querySelectorAll('.page').forEach(el=>el.classList.remove('activePage'));active?.classList.add('activePage');if($('pageTitle'))$('pageTitle').textContent='Pedidos'}
 document.querySelectorAll('.page').forEach(el=>display(el,el===active&&allowed.has(pageName(el))));
 document.querySelectorAll('.sideNav [data-page]').forEach(el=>el.classList.toggle('active',String(el.dataset.page||'')===pageName(active)));
 $('page-pedidos')?.classList.remove('adminPage');$('page-taxa-entrega')?.classList.remove('adminPage');
 $('motoDeliveryPanel')?.style.setProperty('display','none','important');$('adminOrderFilters')?.style.setProperty('display','none','important');
}
async function loadRole(){
 const client=window.BV_SUPABASE||window.sb;if(!client)return false;
 try{const {data:{user},error:ae}=await client.auth.getUser();if(ae||!user)return false;
  const {data:profile,error:pe}=await client.from('profiles').select('name,role').eq('id',user.id).maybeSingle();if(pe||!profile)return false;
  window.BV_ROLE=roleNorm(profile.role);window.BV_USER_NAME=profile.name||user.email||'';enforce();return window.BV_ROLE==='motoboy';
 }catch(e){console.warn('[BV ACCESS]',e);return false}
}
function installNav(){
 if(typeof window.showPage==='function'&&!window.BV_ORIGINAL_SHOW_PAGE){
  window.BV_ORIGINAL_SHOW_PAGE=window.showPage;
  window.showPage=async function(p,internal=false){
   if(isMoto()){p=allowed.has(String(p))?String(p):'pedidos';enforce()}
   const r=await window.BV_ORIGINAL_SHOW_PAGE(p,internal);
   if(isMoto()){enforce();if(p==='pedidos')await window.renderMotoOrders?.();if(p==='taxa-entrega')await window.renderMotoFeeOrders?.()}return r;
  };
 }
}
window.openMotoPage=async function(page='pedidos'){
 const target=allowed.has(String(page))?String(page):'pedidos';
 if(!(await loadRole())){window.toast?.('Esta conta não está cadastrada como motoboy.');return false}
 enforce();await window.showPage(target,true);enforce();return true;
};
async function boot(){
 installNav();const moto=await loadRole();if(!moto)return;
 enforce();const active=pageName(document.querySelector('.page.activePage'));const target=allowed.has(active)?active:'pedidos';
 await window.showPage(target,true);enforce();
 if(target==='pedidos')await window.renderMotoOrders?.();else await window.renderMotoFeeOrders?.();
}
let timer=0;const schedule=()=>{if(!isMoto())return;clearTimeout(timer);timer=setTimeout(()=>{installNav();enforce()},100)};
document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120),{once:true});window.addEventListener('load',()=>setTimeout(boot,120),{once:true});
const client=window.BV_SUPABASE||window.sb;client?.auth?.onAuthStateChange?.(event=>{if(event==='SIGNED_OUT'){window.BV_ROLE='usuario';return}setTimeout(boot,120)});
const observer=new MutationObserver(mutations=>{if(!isMoto())return;const relevant=mutations.some(m=>{const nodes=[...m.addedNodes,...m.removedNodes];return nodes.some(n=>n.nodeType===1&&(n.matches?.('.sideNav,.sideNav *, .page')||n.querySelector?.('.sideNav,.page')))});if(relevant)schedule()});document.addEventListener('DOMContentLoaded',()=>document.body&&observer.observe(document.body,{childList:true,subtree:true}),{once:true});
setTimeout(()=>{installNav();if(isMoto())enforce()},300);
})();