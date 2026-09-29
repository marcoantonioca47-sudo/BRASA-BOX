/* BRASABOX — notificações do administrador para novos pedidos */
(()=>{'use strict';
  const sb=()=>window.BV_SUPABASE||window.sb;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const isAdmin=()=>['administrador','admin'].includes(norm(window.BV_ROLE));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const seen=new Set();
  let channel=null;
  let audio=null;

  function keyToBytes(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }

  function beep(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audio=audio||(new AC());
      if(audio.state==='suspended')return;
      const now=audio.currentTime;
      [0,.16,.32].forEach((t,i)=>{
        const o=audio.createOscillator(),g=audio.createGain();
        o.type='sine';o.frequency.value=i===1?1046:880;
        g.gain.setValueAtTime(.0001,now+t);
        g.gain.exponentialRampToValueAtTime(.16,now+t+.02);
        g.gain.exponentialRampToValueAtTime(.0001,now+t+.13);
        o.connect(g);g.connect(audio.destination);o.start(now+t);o.stop(now+t+.14);
      });
    }catch(e){}
  }

  function ensureStyle(){
    if(document.getElementById('bvAdminNotifyStyle'))return;
    const s=document.createElement('style');s.id='bvAdminNotifyStyle';s.textContent=`
      .bvAdminAlert{position:fixed;right:18px;top:78px;z-index:2147483000;width:min(390px,calc(100vw - 28px));padding:14px;border:2px solid rgba(229,9,20,.72);border-radius:16px;background:linear-gradient(145deg,#211217,#0d0f12);box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 4px rgba(229,9,20,.08);color:#fff;display:flex;gap:11px;align-items:flex-start;animation:bvAdminAlertIn .22s ease}
      .bvAdminAlertIcon{width:42px;height:42px;flex:0 0 42px;border-radius:12px;background:#e50914;display:grid;place-items:center;font-size:21px}
      .bvAdminAlertBody{min-width:0;flex:1}.bvAdminAlertBody small{display:block;color:#ff5961;font-size:9px;font-weight:950;letter-spacing:1.3px}.bvAdminAlertBody b{display:block;margin-top:3px;font-size:17px}.bvAdminAlertBody span{display:block;margin-top:4px;color:#aeb4bd;font-size:12px}
      .bvAdminAlert button{border:0;background:transparent;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0 2px}
      #bvAdminNotifyBtn{display:inline-flex!important;align-items:center;gap:7px;min-height:38px;padding:0 11px;border:1px solid rgba(229,9,20,.45);border-radius:10px;background:rgba(229,9,20,.10);color:#fff;font-weight:900;cursor:pointer}
      #bvAdminNotifyBtn.active{background:rgba(22,131,75,.16);border-color:rgba(22,131,75,.45)}
      @keyframes bvAdminAlertIn{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
      @media(max-width:600px){.bvAdminAlert{right:10px;top:70px;width:calc(100vw - 20px)}#bvAdminNotifyBtn span{display:none}}
    `;document.head.appendChild(s);
  }

  function showAlert(order){
    const id=String(order?.id||'');if(!id||seen.has(id))return;
    seen.add(id);
    beep();
    const old=document.getElementById('bvAdminAlert');old?.remove();
    const n=document.createElement('div');n.id='bvAdminAlert';n.className='bvAdminAlert';
    n.innerHTML='<div class="bvAdminAlertIcon">📋</div><div class="bvAdminAlertBody"><small>NOVO PEDIDO</small><b>Pedido #'+esc(String(order.order_number||'').padStart(3,'0'))+'</b><span>'+esc(order.customer_name||'Cliente')+' · '+money(order.total)+'</span></div><button type="button" aria-label="Fechar">×</button>';
    n.querySelector('button').onclick=()=>n.remove();
    n.addEventListener('click',e=>{if(e.target===n||e.target.closest('.bvAdminAlertBody')){window.openAdmin?.('pedidos');n.remove()}});
    document.body.appendChild(n);
    setTimeout(()=>n.remove(),12000);
    try{
      const badge=document.getElementById('homeNotificationBadge');
      if(badge)badge.textContent=String((Number(badge.textContent)||0)+1);
    }catch(e){}
    if('Notification' in window && Notification.permission==='granted' && document.hidden){
      try{new Notification('BrasaBox — NOVO PEDIDO',{body:'Pedido #'+String(order.order_number||'').padStart(3,'0')+' recebido de '+(order.customer_name||'Cliente')+'.',tag:'bv-new-order-'+id})}catch(e){}
    }
  }

  async function setupAdminPush(){
    try{
      if(!isAdmin()||!('serviceWorker' in navigator)||!('PushManager' in window))return false;
      if(!('Notification' in window)||Notification.permission!=='granted')return false;
      const client=sb();if(!client)return false;
      const {data:{user}}=await client.auth.getUser();if(!user)return false;
      const keyRes=await fetch((String(window.BV_SUPABASE_CONFIG?.url||'').replace(/\/$/,'')+'/functions/v1/bv-push-admin-new-order'),{cache:'no-store'});
      if(!keyRes.ok)throw new Error('public key unavailable');
      const {publicKey}=await keyRes.json();if(!publicKey)throw new Error('public key missing');
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyToBytes(publicKey)});
      const json=sub.toJSON(),keys=json.keys||{};
      const {error}=await client.from('push_subscriptions').upsert({
        user_id:user.id,endpoint:json.endpoint,p256dh:keys.p256dh,auth:keys.auth,user_agent:navigator.userAgent,active:true,updated_at:new Date().toISOString()
      },{onConflict:'endpoint'});
      if(error)throw error;
      localStorage.setItem('bv_admin_push_ready','1');
      return true;
    }catch(e){console.warn('[ADMIN PUSH]',e);return false}
  }

  async function enable(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC){audio=audio||(new AC());await audio.resume();beep()}
    }catch(e){}
    if(!('Notification' in window)){await setupAdminPush();return}
    let p=Notification.permission;
    if(p==='default')p=await Notification.requestPermission();
    if(p==='granted'){
      const ok=await setupAdminPush();
      const b=document.getElementById('bvAdminNotifyBtn');
      if(b){b.classList.toggle('active',ok);b.innerHTML=ok?'🔔 <span>Alertas ativos</span>':'🔔 <span>Ativar alertas</span>'}
    }
  }

  function injectButton(){
    if(!isAdmin()||document.getElementById('bvAdminNotifyBtn'))return;
    const bar=document.querySelector('#page-inicio .homeNotificationBar');
    const target=bar?.querySelector('.notifyBtn') || null;
    const adminActions=document.querySelector('.activePage.adminPage .adminTopActions');
    if(!bar && !adminActions)return;
    const b=document.createElement('button');b.id='bvAdminNotifyBtn';b.type='button';b.innerHTML='🔔 <span>Ativar alertas</span>';b.onclick=enable;
    if(target) target.insertAdjacentElement('afterend',b);
    else adminActions.prepend(b);
    try{
      if('Notification' in window && Notification.permission==='granted'&&localStorage.getItem('bv_admin_push_ready')==='1'){
        b.classList.add('active');b.innerHTML='🔔 <span>Alertas ativos</span>';
      }
    }catch(e){}
  }

  function startRealtime(){
    const client=sb();if(!client||channel||!isAdmin())return;
    channel=client.channel('bv-admin-new-orders').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},payload=>{
      const o=payload?.new;if(o?.id)showAlert(o);
      window.BV_REFRESH_ORDERS?.().catch?.(()=>{});
    }).subscribe(s=>console.log('[BV ADMIN NOTIFY] canal:',s));
  }

  function boot(){
    ensureStyle();
    if(!isAdmin()){setTimeout(boot,700);return}
    injectButton();
    startRealtime();
    if(typeof Notification!=='undefined'&&Notification.permission==='granted')setupAdminPush();
  }

  document.addEventListener('click',e=>{
    if(!isAdmin())return;
    const t=e.target.closest?.('#page-dashboard,#page-pedidos');
    if(t)injectButton();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.BV_ADMIN_NOTIFY_VERSION='2026.09.27.2010';
  window.enableAdminNotifications=enable;
})();