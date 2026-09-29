(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),toast=m=>{const x=$('toast');if(x){x.textContent=m;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}},admin=()=>['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase()),sb=()=>window.BV_SUPABASE;
const labels={recebido:'Recebido',aguardando_pagamento:'Aguardando pagamento',em_preparo:'Em preparo',em_producao:'Pronto',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'},next={recebido:'em_preparo',em_preparo:'saiu_entrega',em_producao:'saiu_entrega',saiu_entrega:'entregue'};
const styleText=`#bvUpd{position:fixed;right:12px;bottom:12px;z-index:9998}#bvBell{width:48px;height:48px;border:1px solid #343a44;border-radius:14px;background:#171a20;color:#fff;font-size:20px;box-shadow:0 12px 30px #0008;cursor:pointer;position:relative}#bvBadge{position:absolute;right:-4px;top:-5px;background:#e50914;border:2px solid #0d0f12;border-radius:20px;min-width:18px;height:18px;display:none;place-items:center;font-size:9px;font-weight:900}#bvNotices{display:none;width:min(360px,calc(100vw - 24px));max-height:55vh;overflow:auto;margin-bottom:8px;padding:13px;background:#111419;color:#fff;border:1px solid #343a44;border-radius:15px;box-shadow:0 25px 70px #000b}#bvNotices.show{display:block}#bvNotices h3{margin:0 0 8px;font-size:15px}.bvN{display:flex;gap:9px;padding:10px 0;border-bottom:1px solid #ffffff12;align-items:flex-start}.bvN:last-child{border:0}.bvN>div{flex:1;min-width:0}.bvNDelete{flex:0 0 24px;width:24px;height:24px;border:1px solid #3b2225;border-radius:7px;background:#241215;color:#ff5b63;font-size:19px;line-height:19px;font-weight:900;display:grid;place-items:center;cursor:pointer;padding:0;margin-top:-2px}.bvNDelete:hover{background:#e50914;border-color:#e50914;color:#fff;transform:scale(1.05)}.bvN b{display:block;font-size:12px}.bvN small{display:block;color:#8f96a0;margin-top:3px}.bvKpiGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.bvKpi{padding:14px;border:1px solid #ffffff12;border-radius:14px;background:linear-gradient(145deg,#171a20,#0d0f12)}.bvKpi small{color:#8f96a0;font-size:10px;font-weight:900;text-transform:uppercase}.bvKpi strong{display:block;margin-top:6px;font-size:22px}.bvKpi span{display:block;color:#737b86;font-size:11px;margin-top:3px}.bvKitchen{margin-bottom:16px;padding:15px;border:1px solid #ffffff12;border-radius:15px;background:linear-gradient(145deg,#15181d,#0d0f12)}.bvKH{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px}.bvKH h3{margin:0;font-size:17px}.bvKH small{color:#8f96a0}.bvKG{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.bvKC{background:#0a0c0f;border:1px solid #ffffff0e;border-radius:11px;padding:10px}.bvKC h4{margin:0;font-size:11px;text-transform:uppercase}.bvKI{margin-top:8px;padding:9px;border-radius:9px;background:#171a20}.bvKI b{font-size:12px}.bvKI small{display:block;color:#8f96a0;margin-top:3px}.bvKI button{width:100%;margin-top:7px;min-height:34px;border:0;border-radius:8px;background:#e50914;color:#fff;font-weight:900}.bvTL{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:15px}.bvTS{text-align:center;color:#69717c;font-size:8px;font-weight:900;text-transform:uppercase}.bvTS:before{content:"";display:block;width:11px;height:11px;margin:0 auto 5px;border-radius:50%;background:#343a44}.bvTS.done{color:#fff}.bvTS.done:before{background:#e50914}.bvTS.current:before{box-shadow:0 0 0 4px #e5091428}@media(max-width:800px){.bvKpiGrid{grid-template-columns:repeat(2,1fr)}.bvKG{grid-template-columns:1fr}.bvTL{grid-template-columns:repeat(3,1fr)}}`;
function injectCss(){if($('bvUpdCss'))return;let s=document.createElement('style');s.id='bvUpdCss';s.textContent=styleText;document.head.appendChild(s)}
function notices(){if($('bvUpd'))return;let d=document.createElement('div');d.id='bvUpd';d.innerHTML='<div id="bvNotices"><h3>🔔 Notificações</h3><div id="bvNoticeList"></div></div><button id="bvBell" type="button">🔔<i id="bvBadge">0</i></button>';document.body.appendChild(d);$('bvBell').onclick=()=>{$('bvNotices').classList.toggle('show')};$('bvNoticeList').onclick=e=>{let btn=e.target.closest('[data-notice-delete]');if(!btn)return;let i=Number(btn.dataset.noticeDelete),a=getN();if(Number.isInteger(i)&&i>=0&&i<a.length){a.splice(i,1);localStorage.setItem('bv_notifications',JSON.stringify(a));renderNotices()}};const sync=()=>{const login=$('login'),box=$('bvUpd');if(!box)return;const hidden=login&&getComputedStyle(login).display!=='none';const role=String(window.BV_ROLE||'').toLowerCase();const allowed=!hidden;box.style.display=allowed?'':'none'};renderNotices();sync();new MutationObserver(sync).observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','class']})}
let bvAudioCtx=null,bvAudioReady=false;
function unlockNotificationSound(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!bvAudioCtx)bvAudioCtx=new AC();if(bvAudioCtx.state==='suspended')bvAudioCtx.resume().catch(()=>{});bvAudioReady=true}catch(e){}}
function playOrderSound(){if(!bvAudioReady||!bvAudioCtx)return;try{if(bvAudioCtx.state==='suspended')bvAudioCtx.resume().catch(()=>{});const now=bvAudioCtx.currentTime;[0,0.22,0.44,0.66].forEach((offset,i)=>{const o=bvAudioCtx.createOscillator(),g=bvAudioCtx.createGain();o.type=i===2?'square':'sine';o.frequency.value=[740,988,1175,988][i];g.gain.setValueAtTime(0.0001,now+offset);g.gain.exponentialRampToValueAtTime(0.42,now+offset+0.025);g.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.19);o.connect(g);g.connect(bvAudioCtx.destination);o.start(now+offset);o.stop(now+offset+0.21)})}catch(e){}}
document.addEventListener('pointerdown',unlockNotificationSound,{passive:true});
document.addEventListener('pointerdown',()=>{const role=String(window.BV_ROLE||'').toLowerCase();if(['administrador','admin'].includes(role))requestAdminNotificationPermission?.()},{passive:true});
document.addEventListener('touchstart',unlockNotificationSound,{passive:true});
async function notifyNewOrderDevice(o){
  const title='🔔 NOVO PEDIDO — BrasaBox';
  const body='Pedido #'+(window.orderLabel?.(o)||o.orderNumber||'—')+' recebido de '+(o.customer||'Cliente')+'.';
  try{
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const tag='bv-new-order-'+o.id;
    const reg=await navigator.serviceWorker?.ready.catch(()=>null);
    if(reg?.showNotification){
      await reg.showNotification(title,{body,tag,renotify:true,requireInteraction:true,silent:false,icon:'./bv-logo.png',badge:'./bv-logo.png',data:{orderId:o.id}});
      return;
    }
    const n=new Notification(title,{body,tag,renotify:true,requireInteraction:true,silent:false,icon:'./bv-logo.png'});
    n.onclick=()=>{window.focus?.();document.querySelector('[data-page="pedidos"],#menuPedidos,button[onclick*="pedidos"]')?.click();n.close?.()};
  }catch(e){console.warn('[BV NOTIFY]',e)}
}
async function requestAdminNotificationPermission(){
  try{
    if(typeof Notification==='undefined'||Notification.permission==='denied')return;
    if(Notification.permission==='default')await Notification.requestPermission();
  }catch(e){}
}
function getN(){try{let a=JSON.parse(localStorage.getItem('bv_notifications')||'[]')||[];const role=String(window.BV_ROLE||'').toLowerCase();if(role==='motoboy')return a.filter(n=>n&&n.deliveryPickup===true);if(role!=='administrador'&&role!=='admin')return a.filter(n=>n&&n.customerNotice===true);return a}catch{return[]}}
function addN(title,detail,key){let a;try{a=JSON.parse(localStorage.getItem('bv_notifications')||'[]')||[]}catch{a=[]}const role=String(window.BV_ROLE||'').toLowerCase();const deliveryPickup=role==='motoboy',customerNotice=role!=='motoboy'&&!['administrador','admin'].includes(role);if(a.some(x=>x.key===key))return;a.unshift({title,detail,key,deliveryPickup,customerNotice});localStorage.setItem('bv_notifications',JSON.stringify(a.slice(0,25)));renderNotices()}
function renderNotices(){let l=$('bvNoticeList'),b=$('bvBadge');if(!l)return;let a=getN();l.innerHTML=a.length?a.map((n,i)=>'<div class="bvN" data-notice-index="'+i+'"><span>🔔</span><div><b>'+esc(n.title)+'</b><small>'+esc(n.detail)+'</small></div><button type="button" class="bvNDelete" data-notice-delete="'+i+'" aria-label="Excluir notificação" title="Excluir notificação">×</button></div>').join(''):'<small style="color:#737b86">Nenhuma notificação.</small>';if(b){b.textContent=Math.min(a.length,99);b.style.display=a.length?'grid':'none'}}
function kpis(){let p=$('page-dashboard');if(!p)return;let b=$('bvKpiGrid');if(!b){b=document.createElement('div');b.id='bvKpiGrid';b.className='bvKpiGrid';p.prepend(b)}let t=new Date(),a=(window.orders||[]).filter(o=>{let d=new Date(o.created_at);return o.rawStatus!=='cancelado'&&d.toDateString()===t.toDateString()}),v=a.reduce((s,o)=>s+Math.max(0,(Number(o.total)||0)-(Number(o.deliveryFee ?? o.delivery_fee)||0)),0),avg=a.length?v/a.length:0,done=a.filter(o=>o.rawStatus==='entregue').length,open=a.filter(o=>!['entregue','cancelado'].includes(o.rawStatus)).length;b.innerHTML='<div class="bvKpi"><small>Faturamento hoje</small><strong>'+money(v)+'</strong><span>'+a.length+' pedido(s)</span></div><div class="bvKpi"><small>Ticket médio</small><strong>'+money(avg)+'</strong><span>Hoje</span></div><div class="bvKpi"><small>Entregues</small><strong>'+done+'</strong><span>Hoje</span></div><div class="bvKpi"><small>Em aberto</small><strong>'+open+'</strong><span>Acompanhar</span></div>'}
async function advance(id,st){if(typeof window.statusOrder==='function')return window.statusOrder(id,st);return toast('Função de atualização indisponível.')}
function timeline(){let p=$('page-acompanhar'),c=p?.querySelector('.trackingCard');if(!c)return;let old=c.querySelector('.bvTL');if(old)old.remove();let o=(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')))||(window.orders||[])[0];if(!o)return;let flow=['recebido','em_preparo','em_producao','saiu_entrega','entregue'],cur=flow.indexOf(o.rawStatus),w=document.createElement('div');w.className='bvTL';w.innerHTML=flow.map((s,i)=>'<div class="bvTS '+(i<cur||o.rawStatus==='entregue'?'done ':'')+(i===cur?'current':'')+'">'+labels[s]+'</div>').join('');c.appendChild(w)}
let last='';
function watch(){
  const a=window.orders||[];
  const snap=a.map(o=>o.id+'|'+o.rawStatus+'|'+o.paymentStatus).join(';');
  if(snap===last)return;
  let old={};
  try{old=JSON.parse(sessionStorage.getItem('bv_statuses')||'{}')}catch(e){old={};}

  if(last){
    a.forEach(o=>{
      const role=String(window.BV_ROLE||'').toLowerCase();
      const isMoto=role==='motoboy';
      const isAdmin=['administrador','admin'].includes(role);

      if(isMoto){
        if(old[o.id]&&old[o.id]!==o.rawStatus&&o.rawStatus==='em_preparo'){
          addN(
            '👨‍🍳 Pedido em preparo',
            'O pedido #'+(window.orderLabel?.(o)||o.orderNumber||'—')+' está em preparo.',
            'preparo:'+o.id
          );
          playOrderSound();
        }
      }      }else if(!isAdmin){
        if(old[o.id]&&old[o.id]!==o.rawStatus&&o.rawStatus==='saiu_entrega'&&String(localStorage.getItem('bv_track_id')||'')===String(o.id)){
          addN(
            '🛵 Pedido saiu para entrega',
            'Seu pedido #'+(window.orderLabel?.(o)||o.orderNumber||'—')+' saiu para entrega.',
            'delivery:'+o.id+':'+o.rawStatus
          );
        }
      }else if(isAdmin){
        if(!old[o.id]){
          addN(
            '🔔 Novo pedido',
            'Pedido #'+(window.orderLabel?.(o)||o.orderNumber||'—')+' recebido.',
            'new:'+o.id
          );
          playOrderSound();
          notifyNewOrderDevice(o);
        }
      }else{
        // Cliente: somente avisa quando o próprio pedido saiu para entrega.
        if(old[o.id]&&old[o.id]!==o.rawStatus&&o.rawStatus==='saiu_entrega'){
          addN(
            '🛵 Pedido saiu para entrega',
            'Seu pedido #'+(window.orderLabel?.(o)||o.orderNumber||'—')+' saiu para entrega.',
            'delivery:'+o.id+':'+o.rawStatus
          );
        }
      }
    });
  }

  const m={};
  a.forEach(o=>m[o.id]=o.rawStatus);
  sessionStorage.setItem('bv_statuses',JSON.stringify(m));
  kpis();
  timeline();

  const trackId=localStorage.getItem('bv_track_id');
  if(trackId&&document.getElementById('page-acompanhar')?.classList.contains('activePage')){
    const tracked=a.find(x=>String(x.id)===String(trackId));
    if(tracked&&typeof window.renderTracking==='function'){
      const sig=JSON.stringify({
        id:tracked.id,status:tracked.rawStatus,payment:tracked.payment,paymentStatus:tracked.paymentStatus,
        motoboyId:tracked.motoboyId,changeFor:tracked.changeFor,total:tracked.total,
        pixPaymentId:tracked.pixPaymentId,pixQrCode:tracked.pixQrCode,pixQrCodeBase64:tracked.pixQrCodeBase64,
        pixExpiresAt:tracked.pixExpiresAt
      });
      if(sig!==window.BV_TRACKING_RENDER_SIG){
        window.BV_TRACKING_RENDER_SIG=sig;
        window.renderTracking(tracked);
      }
    }
  }
  last=snap;
}
function patch(){if(window.BV_UPDATES_PATCHED||typeof window.BV_REFRESH_ORDERS!=='function')return;let f=window.BV_REFRESH_ORDERS;window.BV_REFRESH_ORDERS=async(...x)=>{let r=await f(...x);setTimeout(watch,20);return r};window.BV_UPDATES_PATCHED=true}
function boot(){injectCss();notices();patch();watch();kpis();timeline()}
document.addEventListener('DOMContentLoaded',boot,{once:true});
let bvHousekeepingTimer=null;
function startHousekeeping(){if(bvHousekeepingTimer)clearInterval(bvHousekeepingTimer);bvHousekeepingTimer=setInterval(()=>{patch();watch()},4000)}
startHousekeeping();
window.BV_UPDATES_VERSION='2026.09.26.513'
})();

/* DASHBOARD PRO — vendas, produtos, pagamentos e faturamento por período */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),sb=()=>window.BV_SUPABASE,isAdmin=()=>['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase());
let lastKey='',lastFetch=0;
function css(){if($('bvProDashCss'))return;const s=document.createElement('style');s.id='bvProDashCss';s.textContent=`
#bvProDash{margin-top:16px}.bvDashToolbar{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:14px}.bvDashToolbar h3{margin:0;font-size:18px;font-weight:950}.bvDashToolbar small{display:block;color:#8f96a0;margin-top:4px}.bvPeriodTabs{display:flex;gap:6px;flex-wrap:wrap}.bvPeriodTabs button{height:38px;padding:0 12px;border:1px solid #343a44;border-radius:9px;background:#171a20;color:#fff;font-weight:850;cursor:pointer}.bvPeriodTabs button.active,.bvPeriodTabs button:hover{background:#e50914;border-color:#e50914}.bvAnalyticsGrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,1fr);gap:14px}.bvAnalyticCard{min-width:0;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:linear-gradient(145deg,#171a20,#0d0f12);box-shadow:0 14px 35px rgba(0,0,0,.18)}.bvAnalyticCard.full{grid-column:1/-1}.bvAnalyticHead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}.bvAnalyticHead b{font-size:14px;font-weight:950}.bvAnalyticHead small{display:block;color:#8f96a0;margin-top:4px;font-size:11px}.bvTrend{height:235px;position:relative;overflow:hidden}.bvTrend svg{width:100%;height:100%;display:block}.bvTrendGrid{stroke:rgba(255,255,255,.08);stroke-width:1}.bvTrendLine{fill:none;stroke:#e50914;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.bvTrendArea{fill:url(#bvTrendFill)}.bvTrendDot{fill:#fff;stroke:#e50914;stroke-width:3}.bvTrendLabels{display:flex;justify-content:space-between;color:#737b86;font-size:9px;margin-top:4px;gap:8px}.bvBarList{display:flex;flex-direction:column;gap:11px}.bvBarRow{display:grid;grid-template-columns:minmax(90px,150px) 1fr auto;gap:9px;align-items:center}.bvBarName{font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bvBarTrack{height:9px;border-radius:99px;background:#242830;overflow:hidden}.bvBarFill{height:100%;border-radius:99px;background:linear-gradient(90deg,#e50914,#ff424b)}.bvBarValue{font-size:10px;color:#c9cdd3;white-space:nowrap;font-weight:850}.bvPayWrap{display:flex;align-items:center;justify-content:center;gap:20px;min-height:190px}.bvDonut{width:145px;height:145px;border-radius:50%;position:relative;display:grid;place-items:center;flex:none}.bvDonut:after{content:"";width:82px;height:82px;border-radius:50%;background:#111419;border:1px solid #272c33;position:absolute}.bvDonutCenter{position:absolute;z-index:2;text-align:center}.bvDonutCenter b{display:block;font-size:19px}.bvDonutCenter small{color:#8f96a0;font-size:9px}.bvLegend{display:flex;flex-direction:column;gap:9px}.bvLegendItem{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800}.bvLegendDot{width:9px;height:9px;border-radius:50%;background:#e50914;flex:none}.bvLegendItem small{margin-left:auto;color:#8f96a0;font-weight:700}.bvPeriodSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.bvSummaryBox{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#111419}.bvSummaryBox small{display:block;color:#737b86;font-size:9px;text-transform:uppercase;font-weight:900}.bvSummaryBox b{display:block;margin-top:5px;font-size:16px}.bvEmptyAnalytics{min-height:150px;display:grid;place-items:center;color:#737b86;text-align:center;font-size:12px}@media(max-width:900px){.bvAnalyticsGrid{grid-template-columns:1fr}.bvAnalyticCard.full{grid-column:auto}}@media(max-width:600px){.bvBarRow{grid-template-columns:92px 1fr auto}.bvPayWrap{flex-direction:column;gap:12px}.bvDonut{width:125px;height:125px}.bvPeriodSummary{grid-template-columns:1fr}.bvTrend{height:205px}}
`;document.head.appendChild(s)}
function periodDays(){const p=window.BV_ANALYTICS_PERIOD||'30';return p==='7'||p==='30'||p==='90'?Number(p):3650}
function periodLabel(){const p=window.BV_ANALYTICS_PERIOD||'30';return p==='7'?'Últimos 7 dias':p==='90'?'Últimos 90 dias':p==='all'?'Todo o período':'Últimos 30 dias'}
window.setDashboardAnalyticsPeriod=p=>{window.BV_ANALYTICS_PERIOD=p||'30';renderAnalytics(true)}
function baseOrders(){const days=periodDays(),now=new Date(),start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-(days-1));return(window.orders||[]).filter(o=>{if(String(o.rawStatus||'').toLowerCase()==='cancelado')return false;const d=new Date(o.created_at);return !Number.isNaN(d.getTime())&&d>=start&&d<=now})}
function dayKey(v){const d=new Date(v);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dateLabel(k){const p=k.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
function trendSvg(orders){const days=periodDays(),points=[],now=new Date();now.setHours(0,0,0,0);const start=new Date(now);start.setDate(start.getDate()-(days-1));for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=dayKey(d),value=orders.filter(o=>dayKey(o.created_at)===k).reduce((s,o)=>s+Math.max(0,(Number(o.total)||0)-(Number(o.deliveryFee ?? o.delivery_fee)||0)),0);points.push({k,value})}const shown=days>90?points.filter((_,i)=>i%7===0||i===points.length-1):points,vals=shown.map(x=>x.value),max=Math.max(1,...vals),w=900,h=210,padX=12,padY=18,xy=(v,i)=>[padX+(shown.length===1?0:i/(shown.length-1))*(w-padX*2),h-padY-(v/max)*(h-padY*2)],coords=shown.map((x,i)=>xy(x.value,i)),line=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' '),area=line+' L '+coords[coords.length-1][0].toFixed(1)+' '+(h-padY)+' L '+coords[0][0].toFixed(1)+' '+(h-padY)+' Z',grid=[.25,.5,.75,1].map(q=>'<line class="bvTrendGrid" x1="'+padX+'" y1="'+(h-padY-(q*max/max)*(h-padY*2))+'" x2="'+(w-padX)+'" y2="'+(h-padY-(q*max/max)*(h-padY*2))+'"/>').join(''),dots=coords.map((p,i)=>'<circle class="bvTrendDot" cx="'+p[0]+'" cy="'+p[1]+'" r="'+(shown.length<35?3.2:2.5)+'"><title>'+dateLabel(shown[i].k)+': '+money(shown[i].value)+'</title></circle>').join('');return'<div class="bvTrend"><svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><defs><linearGradient id="bvTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(229,9,20,.28)"/><stop offset="100%" stop-color="rgba(229,9,20,0)"/></linearGradient></defs>'+grid+'<path class="bvTrendArea" d="'+area+'"/><path class="bvTrendLine" d="'+line+'"/>'+dots+'</svg></div><div class="bvTrendLabels"><span>'+dateLabel(shown[0].k)+'</span><span>'+dateLabel(shown[Math.floor(shown.length/2)].k)+'</span><span>'+dateLabel(shown[shown.length-1].k)+'</span></div>'}
function productChart(items){const map={};(items||[]).forEach(i=>{const name=String(i.product_name||i.name||'Produto'),qty=Math.max(0,Number(i.quantity)||0),total=Number(i.total||0);if(!map[name])map[name]={qty:0,total:0};map[name].qty+=qty;map[name].total+=total});const rows=Object.entries(map).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);if(!rows.length)return'<div class="bvEmptyAnalytics">Nenhum item vendido no período.</div>';const max=Math.max(1,...rows.map(x=>x[1].qty));return'<div class="bvBarList">'+rows.map(([name,v])=>'<div class="bvBarRow"><span class="bvBarName" title="'+esc(name)+'">'+esc(name)+'</span><div class="bvBarTrack"><div class="bvBarFill" style="width:'+Math.max(3,v.qty/max*100)+'%"></div></div><span class="bvBarValue">'+v.qty+' un.</span></div>').join('')+'</div>'}
function paymentChart(orders){const map={Pix:0,'Cartão':0,Dinheiro:0};orders.forEach(o=>{const p=String(o.payment||'').toLowerCase(),k=p.includes('pix')?'Pix':p.includes('cart')?'Cartão':'Dinheiro';map[k]+=Math.max(0,(Number(o.total)||0)-(Number(o.deliveryFee ?? o.delivery_fee)||0))});const total=Object.values(map).reduce((a,b)=>a+b,0);if(!total)return'<div class="bvEmptyAnalytics">Nenhuma venda no período.</div>';const colors=['#e50914','#ffb000','#3b82f6'];let cur=0;const stops=Object.values(map).map((v,i)=>{const a=cur/total*360,b=(cur+v)/total*360;cur+=v;return colors[i]+' '+a+'deg '+b+'deg'}).join(',');return'<div class="bvPayWrap"><div class="bvDonut" style="background:conic-gradient('+stops+')"><div class="bvDonutCenter"><b>'+money(total)+'</b><small>faturamento</small></div></div><div class="bvLegend">'+Object.entries(map).map(([k,v],i)=>'<div class="bvLegendItem"><i class="bvLegendDot" style="background:'+colors[i]+'"></i><span>'+k+'</span><small>'+money(v)+'</small></div>').join('')+'</div></div>'}
async function fetchItems(orders){const client=sb();if(!client||!orders.length)return[];const ids=orders.map(o=>o.id).filter(Boolean),r=await client.from('order_items').select('*').in('order_id',ids);if(r.error){console.warn('Dashboard order_items:',r.error.message);return[]}return r.data||[]}
async function renderAnalytics(force){if(!isAdmin()||!$('page-dashboard')||!$('page-dashboard').classList.contains('activePage'))return;css();let host=$('bvProDash');if(!host){host=document.createElement('section');host.id='bvProDash';host.className='panel';$('page-dashboard').appendChild(host)}const orders=baseOrders(),key=(window.BV_ANALYTICS_PERIOD||'30')+'|'+orders.map(o=>o.id+':'+o.rawStatus+':'+o.total+':'+(o.deliveryFee??o.delivery_fee??0)).join(',');if(!force&&key===lastKey&&Date.now()-lastFetch<12000)return;lastKey=key;lastFetch=Date.now();host.innerHTML='<div class="bvDashToolbar"><div><h3>📊 Análises de vendas</h3><small>Indicadores calculados a partir dos pedidos registrados.</small></div><div class="bvPeriodTabs">'+['7','30','90','all'].map(p=>'<button type="button" data-period="'+p+'" class="'+((window.BV_ANALYTICS_PERIOD||'30')===p?'active':'')+'">'+(p==='all'?'Tudo':p+' dias')+'</button>').join('')+'</div></div><div id="bvAnalyticsBody"><div class="bvEmptyAnalytics">Carregando análise...</div></div>';host.querySelectorAll('.bvPeriodTabs button').forEach(b=>b.onclick=()=>window.setDashboardAnalyticsPeriod(b.dataset.period));const purchaseTotal=o=>Math.max(0,(Number(o?.total)||0)-(Number(o?.deliveryFee ?? o?.delivery_fee)||0));const items=await fetchItems(orders),revenue=orders.reduce((s,o)=>s+purchaseTotal(o),0),count=orders.length,avg=count?revenue/count:0,body=$('bvAnalyticsBody');if(!body)return;body.innerHTML='<div class="bvAnalyticsGrid"><article class="bvAnalyticCard full"><div class="bvAnalyticHead"><div><b>Faturamento por período</b><small>Evolução diária das vendas · '+esc(periodLabel())+'</small></div><strong>'+money(revenue)+'</strong></div>'+trendSvg(orders)+'<div class="bvPeriodSummary"><div class="bvSummaryBox"><small>Pedidos</small><b>'+count+'</b></div><div class="bvSummaryBox"><small>Ticket médio</small><b>'+money(avg)+'</b></div><div class="bvSummaryBox"><small>Produtos vendidos</small><b>'+items.reduce((s,i)=>s+(Number(i.quantity)||0),0)+'</b></div></div></article><article class="bvAnalyticCard"><div class="bvAnalyticHead"><div><b>Produtos mais vendidos</b><small>Quantidade de unidades</small></div></div>'+productChart(items)+'</article><article class="bvAnalyticCard"><div class="bvAnalyticHead"><div><b>Formas de pagamento</b><small>Participação no faturamento</small></div></div>'+paymentChart(orders)+'</article></div>'}
css();window.BV_ANALYTICS_PERIOD=window.BV_ANALYTICS_PERIOD||'30';document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderAnalytics(true),250),{once:true});setInterval(()=>renderAnalytics(false),30000);
})();