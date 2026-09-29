/* BRASABOX — pagamento a prazo / limite por usuário v2 */
(()=>{'use strict';
const $=id=>document.getElementById(id), sb=()=>window.BV_SUPABASE||null;
const isAdmin=()=>['administrador','admin'].includes(String(window.BV_ROLE||'').trim().toLowerCase());
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function css(){if($('bvCreditStyle'))return;const s=document.createElement('style');s.id='bvCreditStyle';s.textContent=`
#page-config .bvCreditBox{margin-top:12px;padding:13px;border:1px solid rgba(229,9,20,.22);border-radius:14px;background:linear-gradient(145deg,rgba(229,9,20,.075),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
#page-config .bvCreditHead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}
#page-config .bvCreditHead b{font-size:11px;font-weight:950;color:#fff}.bvCreditHead small{font-size:9px;color:#8f96a0}
#page-config .bvCreditGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bvCreditGrid label{display:flex;flex-direction:column;gap:6px;margin:0}
#page-config .bvCreditGrid label span{font-size:9px;color:#8f96a0;font-weight:900;text-transform:uppercase}
#page-config .bvCreditGrid input{width:100%;box-sizing:border-box}.bvCreditToggle{display:flex!important;align-items:center;justify-content:space-between;flex-direction:row!important;padding:9px 10px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(0,0,0,.16)}
#page-config .bvCreditToggle input{width:18px!important;height:18px}.bvCreditStats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
#page-config .bvCreditStat{padding:8px;border-radius:9px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05)}.bvCreditStat small{display:block;color:#777f89;font-size:8px;font-weight:900;text-transform:uppercase}.bvCreditStat b{display:block;margin-top:3px;color:#fff;font-size:11px}.bvCreditAvailable{color:#55d98a!important}
#page-config .bvCreditSave{width:100%;min-height:38px;margin-top:8px;border:0;border-radius:9px;background:linear-gradient(135deg,#ff2530,#b90008);color:#fff;font-weight:900;cursor:pointer}
#page-pedido .bvCreditPaymentNote{display:none;margin-top:8px;padding:9px 11px;border-radius:10px;background:rgba(85,217,138,.07);border:1px solid rgba(85,217,138,.2);font-size:11px;color:#a9e8bf}
@media(max-width:600px){#page-config .bvCreditGrid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
async function loadCredits(ids){const s=sb();if(!s||!ids.length)return new Map();const r=await s.from('profiles').select('id,credit_enabled,credit_limit,credit_used').in('id',ids);if(r.error){console.warn('[BV CREDIT]',r.error.message);return new Map()}return new Map((r.data||[]).map(x=>[String(x.id),x]))}
function extractId(el){const select=el.querySelector('select[onchange*="changeUserRole"]');const m=String(select?.getAttribute('onchange')||'').match(/changeUserRole\(['"]([^'"]+)/);if(m)return m[1];const del=el.querySelector('[onclick*="deleteUser"]');const d=String(del?.getAttribute('onclick')||'').match(/deleteUser\(['"]([^'"]+)/);return d?.[1]||''}
async function inject(){if(!isAdmin())return;const box=$('userPermissions');if(!box)return;css();const rows=[...box.querySelectorAll('.userPerm,.line')].filter(x=>!x.closest('.bvCreditBox'));const ids=rows.map(extractId).filter(Boolean);if(!ids.length)return;const credits=await loadCredits([...new Set(ids)]);for(const row of rows){const id=extractId(row);if(!id||row.querySelector('.bvCreditBox'))continue;const x=credits.get(String(id))||{},used=Math.max(0,Number(x.credit_used)||0),limit=Math.max(0,Number(x.credit_limit)||0),available=Math.max(0,limit-used);const d=document.createElement('div');d.className='bvCreditBox';d.dataset.creditUser=id;d.innerHTML='<div class="bvCreditHead"><b>💳 PAGAMENTO A PRAZO</b><small>Limite individual</small></div><div class="bvCreditGrid"><label class="bvCreditToggle"><span>Permitir a prazo</span><input class="bvCreditEnabled" type="checkbox" '+(x.credit_enabled?'checked':'')+'></label><label><span>Limite (R$)</span><input class="bvCreditLimit" type="number" min="0" step="0.01" value="'+limit.toFixed(2)+'"></label></div><div class="bvCreditStats"><div class="bvCreditStat"><small>Utilizado</small><b>'+money(used)+'</b></div><div class="bvCreditStat"><small>Disponível</small><b class="bvCreditAvailable">'+money(available)+'</b></div><div class="bvCreditStat"><small>Status</small><b>'+(x.credit_enabled?'Ativo':'Desativado')+'</b></div></div><button type="button" class="bvCreditSave">Salvar configurações</button>';d.querySelector('.bvCreditSave').onclick=()=>save(id,d);row.appendChild(d)}}
async function save(id,box){if(!isAdmin())return;const btn=box.querySelector('.bvCreditSave'),enabled=!!box.querySelector('.bvCreditEnabled')?.checked,limit=Math.max(0,Number(String(box.querySelector('.bvCreditLimit')?.value||'0').replace(',','.'))||0);btn.disabled=true;btn.textContent='Salvando...';try{const r=await sb().rpc('set_customer_credit',{p_user_id:id,p_enabled:enabled,p_limit:limit});if(r.error)throw r.error;btn.textContent='Salvo ✓';await sleep(500);await refresh();window.toast?.('Pagamento a prazo atualizado.')}catch(e){btn.disabled=false;btn.textContent='Salvar configurações';window.bvModal?window.bvModal({icon:'⚠️',kicker:'PAGAMENTO A PRAZO',title:'Erro ao salvar',message:esc(e?.message||e),button:'Entendi'}):alert(e?.message||e)}}
async function refresh(){if(!isAdmin())return;const box=$('userPermissions');if(!box)return;await sleep(80);await inject()}
async function myCredit(){const s=sb();if(!s)return null;const u=(await s.auth.getUser()).data?.user;if(!u)return null;const r=await s.from('profiles').select('credit_enabled,credit_limit,credit_used').eq('id',u.id).maybeSingle();if(r.error||!r.data)return null;const l=Math.max(0,Number(r.data.credit_limit)||0),u=Math.max(0,Number(r.data.credit_used)||0);return{enabled:!!r.data.credit_enabled,available:Math.max(0,l-u)}}
async function checkout(){const p=$('page-pedido'),box=p?.querySelector('.pay');if(!box)return;let b=box.querySelector('.bvCreditPay');if(!b){b=document.createElement('button');b.type='button';b.className='bvCreditPay';b.textContent='💳 A prazo';b.onclick=()=>{window.pay?.('A prazo',b);window.BV_PAYMENT='A prazo';try{localStorage.setItem('bv_payment','A prazo')}catch(_){}p.querySelectorAll('.pay button').forEach(x=>x.classList.toggle('active',x===b));p.querySelector('#troco')?.classList.add('hide')};box.appendChild(b)}const c=await myCredit();b.style.display=c?.enabled&&c.available>0?'':'none';b.disabled=!(c?.enabled&&c.available>0);let n=p.querySelector('.bvCreditPaymentNote');if(!n){n=document.createElement('div');n.className='bvCreditPaymentNote';box.after(n)}n.textContent=c?.enabled&&c.available>0?'Disponível para pagamento a prazo: '+money(c.available):'';n.style.display=c?.enabled&&c.available>0?'block':'none'}
function hook(){css();const c=$('page-config'),p=$('page-pedido');if(c&&!c.dataset.creditObserver){c.dataset.creditObserver='1';new MutationObserver(()=>{if(c.classList.contains('activePage'))inject()}).observe(c,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}if(p&&!p.dataset.creditObserver){p.dataset.creditObserver='1';new MutationObserver(()=>{if(p.classList.contains('activePage'))checkout()}).observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}inject();checkout()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();setTimeout(hook,400);setTimeout(hook,1200);setTimeout(hook,2500);
window.addEventListener('bv:role-changed',hook);
})();
window.saveUserCredit=async function(id,button){
  const box=button&&button.closest?button.closest('.bvCreditBox'):document.querySelector('.bvCreditBox[data-credit-user="'+id+'"]');
  if(!box||!window.sb){return}
  const enabled=!!box.querySelector('[data-credit-enabled]')?.checked;
  const limit=Number(box.querySelector('[data-credit-limit]')?.value||0);
  if(!Number.isFinite(limit)||limit<0){alert('Informe um limite válido.');return}
  button.disabled=true;
  try{
    const {data,error}=await window.sb.rpc('set_customer_credit',{p_user_id:id,p_enabled:enabled,p_limit:limit});
    if(error) throw error;
    if(data===false) throw new Error('Não foi possível salvar o crédito.');
    button.textContent='Salvo ✓';
    setTimeout(()=>{button.textContent='Salvar configurações';},1200);
    if(typeof window.BV_ADMIN_USERS==='function') window.BV_ADMIN_USERS();
  }catch(e){alert(e?.message||'Não foi possível salvar as configurações de crédito.')}finally{button.disabled=false}
};
