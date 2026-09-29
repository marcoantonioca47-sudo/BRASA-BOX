/* BRASABOX — MOTOBOY — implementação limpa */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const db = () => window.BV_SUPABASE || window.sb;
  const normalizeRole = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const isMoto = () => normalizeRole(window.BV_ROLE) === 'motoboy';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  window.BV_MOTO_SCREEN_VERSION = '2026.09.27.2140';
  window.BV_MOTO_ACTIONS = window.BV_MOTO_ACTIONS || new Set();
  // Notificação sonora + visual para novos pedidos do motoboy.
  window.BV_MOTO_NOTIFY_VERSION='2026.09.27.1900';
  window.BV_MOTO_LAST_ORDER_IDS=window.BV_MOTO_LAST_ORDER_IDS||new Set();
  window.BV_MOTO_LAST_ORDER_STATUS=window.BV_MOTO_LAST_ORDER_STATUS||new Map();
  window.BV_MOTO_AUDIO_CTX=null;
  window.BV_MOTO_AUDIO_READY=false;
  window.BV_MOTO_NOTIFIED=window.BV_MOTO_NOTIFIED||new Set();
  window.BV_MOTO_RENDER_PROMISE=null;
  window.BV_MOTO_LAST_SIGNATURE='';
  window.BV_MOTO_LAST_RENDER_AT=0;
  window.BV_MOTO_RENDER_MIN_MS=2500;
  function motoAlertsAlreadyEnabled(){
    try{
      const saved=localStorage.getItem('bv_moto_alerts_enabled')==='1';
      const granted=!('Notification' in window)||Notification.permission==='granted';
      return saved&&granted;
    }catch(e){return false}
  }
  function finalizeMotoAlerts(){
    try{localStorage.setItem('bv_moto_alerts_enabled','1')}catch(e){}
    const b=document.getElementById('bvMotoNotifyBtn');
    if(b){b.textContent='🔔 Alertas ativos';b.dataset.enabled='1';b.style.display='none';}
  }
  async function setupMotoPush(){
    try{
      if(!('serviceWorker' in navigator)||!('PushManager' in window)) return false;
      if(!('Notification' in window)||Notification.permission!=='granted') return false;
      const client=db(); if(!client) return false;
      const {data:{user}}=await client.auth.getUser(); if(!user||!isMoto()) return false;
      const keyRes=await fetch((String(window.BV_SUPABASE_CONFIG?.url||'').replace(/\/$/,'')+'/functions/v1/bv-push-order-ready'),{cache:'no-store'});
      if(!keyRes.ok) throw new Error('public key unavailable');
      const {publicKey}=await keyRes.json(); if(!publicKey) throw new Error('public key missing');
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(publicKey)});
      const json=sub.toJSON(), keys=json.keys||{}, endpoint=json.endpoint;
      if(!endpoint||!keys.p256dh||!keys.auth) throw new Error('invalid push subscription');
      const {error}=await client.from('push_subscriptions').upsert({user_id:user.id,endpoint,p256dh:keys.p256dh,auth:keys.auth,user_agent:navigator.userAgent,active:true,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
      if(error) throw error;
      try{localStorage.setItem('bv_moto_push_ready','1')}catch(e){}
      return true;
    }catch(e){console.warn('[MOTO PUSH]',e);return false}
  }
  function base64UrlToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  window.enableMotoNotifications=()=>{
    let audioStarted=false;
    let notificationState='unsupported';

    // IMPORTANTE: não usar await antes de iniciar o áudio/permissão.
    // No iPhone, o Safari exige que essas ações nasçam diretamente do toque.
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC){
        const ac=window.BV_MOTO_AUDIO_CTX||(window.BV_MOTO_AUDIO_CTX=new AC());
        window.BV_MOTO_AUDIO_READY=false;
        const resume=ac.resume();
        Promise.resolve(resume).then(()=>{
          window.BV_MOTO_AUDIO_READY=(ac.state==='running');
          if(window.BV_MOTO_AUDIO_READY){
            audioStarted=true;
            motoBeep();
          }
          updateMotoNotifyButton(audioStarted,notificationState);
        }).catch(e=>console.warn('[MOTO AUDIO]',e));
      }
    }catch(e){console.warn('[MOTO AUDIO]',e)}

    // Também começa diretamente no gesto do usuário quando o contexto já está ativo.
    try{
      const ac=window.BV_MOTO_AUDIO_CTX;
      if(ac?.state==='running'){
        window.BV_MOTO_AUDIO_READY=true;
        audioStarted=true;
        motoBeep();
      }
    }catch(e){}

    // A solicitação precisa ser disparada pelo próprio clique.
    if('Notification' in window){
      try{
        const current=Notification.permission;
        if(current==='granted'){
          notificationState='granted';
          setupMotoPush();
          finalizeMotoAlerts();
        }else if(current==='denied'){
          notificationState='denied';
        }else{
          Notification.requestPermission().then(state=>{
            notificationState=state;
            if(state==='granted'){finalizeMotoAlerts();setupMotoPush();}
            updateMotoNotifyButton(audioStarted,notificationState);
          }).catch(e=>{
            console.warn('[MOTO NOTIFY PERMISSION]',e);
            notificationState='denied';
            updateMotoNotifyButton(audioStarted,notificationState);
          });
        }
      }catch(e){
        console.warn('[MOTO NOTIFY PERMISSION]',e);
      }
    }

    if(notificationState==='granted'){finalizeMotoAlerts();setupMotoPush();}
    else if(notificationState==='unsupported'){finalizeMotoAlerts();}
    else updateMotoNotifyButton(audioStarted,notificationState);
  };

  function updateMotoNotifyButton(audioStarted,notificationState){
    const b=document.getElementById('bvMotoNotifyBtn');
    if(!b)return;
    if(notificationState==='granted'){
      b.textContent='🔔 Alertas ativos';
    }else if(notificationState==='denied'){
      b.textContent=audioStarted?'🔊 Som ativo':'🔔 Ativar alertas';
    }else if(audioStarted){
      b.textContent='🔊 Som ativo';
    }else{
      b.textContent='🔔 Ativar alertas';
    }
    b.dataset.enabled=audioStarted?'1':'0';
  }

  function motoBeep(){
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=window.BV_MOTO_AUDIO_CTX||(window.BV_MOTO_AUDIO_CTX=new AC());if(ac.state==='suspended')return;const now=ac.currentTime;[0,0.18,0.36].forEach((t,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=i===1?1046:880;g.gain.setValueAtTime(0.0001,now+t);g.gain.exponentialRampToValueAtTime(0.18,now+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,now+t+0.13);o.connect(g);g.connect(ac.destination);o.start(now+t);o.stop(now+t+0.14)})}catch(e){console.warn('[MOTO BEEP]',e)}}
  function motoVisualNotify(o){
    if(!o?.id || String(o.status||'').toLowerCase()!=='em_producao')return;
    const notifyId=String(o.id);
    if(window.BV_MOTO_NOTIFIED.has(notifyId))return;
    window.BV_MOTO_NOTIFIED.add(notifyId);
    const n=document.createElement('div');n.className='bvMotoIncoming';n.innerHTML='<div class="bvMotoIncomingIcon">🏍️</div><div><b>PEDIDO PRONTO</b><strong>Pedido #'+esc(o.order_number||'')+'</strong><small>'+esc(o.customer_name||'Cliente')+' · '+money(o.total)+'</small></div><button type="button" aria-label="Fechar">×</button>';
    n.querySelector('button').onclick=()=>n.remove();document.body.appendChild(n);setTimeout(()=>n.remove(),12000);
    motoBeep();
    if('Notification' in window && Notification.permission==='granted' && document.hidden){try{new Notification('BrasaBox — PEDIDO PRONTO',{body:'Pedido #'+(o.order_number||'')+' está pronto para coleta.',tag:'bv-order-ready-'+o.id})}catch(e){}}
  }
  function motoCheckNewOrders(rows){
    const current=new Set((rows||[]).map(o=>String(o.id)));
    if(!window.BV_MOTO_INITIALIZED){
      window.BV_MOTO_LAST_ORDER_IDS=current;
      window.BV_MOTO_LAST_ORDER_STATUS=new Map((rows||[]).map(o=>[String(o.id),String(o.status||'').toLowerCase()]));
      window.BV_MOTO_INITIALIZED=true;
      return;
    }
    for(const o of rows||[]){
      const id=String(o.id), status=String(o.status||'').toLowerCase();
      const previous=window.BV_MOTO_LAST_ORDER_STATUS.get(id)||'';
      if(status==='em_producao' && previous!=='em_producao' && !window.BV_MOTO_NOTIFIED.has(id)){
        motoVisualNotify(o);
      }
    }
    window.BV_MOTO_LAST_ORDER_IDS=current;
    window.BV_MOTO_LAST_ORDER_STATUS=new Map((rows||[]).map(o=>[String(o.id),String(o.status||'').toLowerCase()]));
  }
  // Exposto globalmente para impedir erro de escopo em versões/cache antigos do Safari.
  window.motoCheckNewOrders=motoCheckNewOrders;
  function installMotoNotifyButton(){
    if(document.getElementById('bvMotoNotifyBtn'))return;
    const b=document.createElement('button');b.id='bvMotoNotifyBtn';b.type='button';b.className='bvMotoNotifyBtn';b.textContent='🔔 Ativar alertas';b.onclick=window.enableMotoNotifications;document.body.appendChild(b);
    if(motoAlertsAlreadyEnabled()) b.style.display='none';
  }
  function subscribeMotoNewOrders(){
    if(!isMoto())return;const client=db();if(!client||window.BV_MOTO_ORDER_CHANNEL)return;
    window.BV_MOTO_ORDER_CHANNEL=client.channel('bv-motoboy-new-orders').on('postgres_changes',{event:'*',schema:'public',table:'orders'},payload=>{
      const o=payload.new||{};
      if(!o.id)return;
      const status=String(o.status||'').toLowerCase();
      const oldStatus=String(payload.old?.status||'').toLowerCase();
      if(payload.eventType==='INSERT'){
        // Pedido novo nunca gera alerta. O alerta é exclusivo da liberação pelo administrador.
        clearTimeout(window.BV_MOTO_RT_TIMER);window.BV_MOTO_RT_TIMER=setTimeout(()=>window.renderMotoOrders?.({silent:true}),1600);
      }else if(payload.eventType==='UPDATE'){
        // Somente a mudança feita para "em_producao" (pronto) gera alerta.
        if(status==='em_producao' && oldStatus!=='em_producao') motoVisualNotify(o);
        clearTimeout(window.BV_MOTO_RT_TIMER);window.BV_MOTO_RT_TIMER=setTimeout(()=>window.renderMotoOrders?.({silent:true}),1600);
      }
    }).subscribe((status,err)=>{if(err)console.warn('[MOTO REALTIME]',err);if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){try{client.removeChannel(window.BV_MOTO_ORDER_CHANNEL)}catch(e){}window.BV_MOTO_ORDER_CHANNEL=null;setTimeout(subscribeMotoNewOrders,3000)}});
    installMotoNotifyButton();
  }

  window.BV_MOTO_DELIVERED = window.BV_MOTO_DELIVERED || new Set();

  const allowed = new Set(['pedidos','taxa-entrega']);

  window.openMotoPage = async function(page='pedidos') {
    const client = db();
    if (!client) return window.toast?.('Supabase não carregou. Recarregue a página.');
    try {
      const { data:{ user }, error:authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Sessão expirada. Entre novamente.');
      const { data:profile, error:profileError } = await client.from('profiles').select('name,role').eq('id',user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile || normalizeRole(profile.role) !== 'motoboy') {
        return window.toast?.('Esta conta não está cadastrada como motoboy.');
      }
      window.BV_ROLE='motoboy';
      window.BV_USER_NAME=profile.name || user.email || '';
      try{localStorage.setItem('bv_profile_cache',JSON.stringify({name:window.BV_USER_NAME,role:'motoboy',userId:user.id}))}catch(e){}
      window.applyAccess?.();
      applyMotoPageChrome();
      window.showPage?.(page,true);
      if (page==='pedidos') { await window.renderMotoOrders?.(); }
      if (page==='taxa-entrega') await window.renderMotoFeeOrders?.();
    } catch(e) {
      console.error('[MOTO OPEN]',e);
      window.toast?.('Não foi possível abrir a área do motoboy: '+String(e?.message||'erro').slice(0,120));
    }
  };

  async function syncMotoRole() {
    const client = db();
    if (!client) return false;
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return false;
      const { data: profile } = await client.from('profiles').select('name,role').eq('id',user.id).maybeSingle();
      if (!profile) return false;
      window.BV_ROLE = normalizeRole(profile.role);
      window.BV_USER_NAME = profile.name || user.email || '';
      window.applyAccess?.();
      return window.BV_ROLE === 'motoboy';
    } catch (e) {
      console.warn('[MOTO ROLE]', e);
      return false;
    }
  }

  window.applyMotoPageChrome = function applyMotoPageChrome() {
    if (!isMoto()) return;
    const page = document.getElementById('page-pedidos');
    if (page) {
      const eyebrow = page.querySelector('.adminTop .eyebrow');
      const title = page.querySelector('.adminTop h2');
      const desc = page.querySelector('.adminTop p');
      if (eyebrow) eyebrow.textContent = 'ÁREA DO MOTOBOY';
      if (title) title.textContent = 'Pedidos';
      if (desc) desc.textContent = 'Pedidos disponíveis para coleta e entregas atribuídas a você.';
      page.classList.remove('adminPage');
    }
    const feePage=document.getElementById('page-taxa-entrega');
    if(feePage){
      const eyebrow=feePage.querySelector('#deliveryFeeEyebrow');
      const title=feePage.querySelector('h2');
      const desc=feePage.querySelector('#deliveryFeeDescription');
      if(eyebrow) eyebrow.textContent='ÁREA DO MOTOBOY';
      if(title) title.textContent='Taxa de entrega';
      if(desc) desc.textContent='Consulte as taxas das suas entregas realizadas.';
      feePage.classList.remove('adminPage');
    }
    document.getElementById('motoDeliveryPanel')?.style.setProperty('display','none','important');
    document.getElementById('adminOrderFilters')?.style.setProperty('display','none','important');
    // Remove qualquer painel legado de produção que ainda possa existir em cache/HTML antigo.
    document.querySelectorAll('#page-pedidos [id*="produc" i],#page-pedidos [class*="produc" i]').forEach(el=>{
      if(el.id!=='orders' && !el.closest('#orders')) el.style.setProperty('display','none','important');
    });
  }

  function applyMenu() {
    if (!isMoto()) return;
    const allowed = new Set(['pedidos','taxa-entrega']);
    // Na aba Pedidos do motoboy, manter somente a pesquisa.
    const filterBox = document.getElementById('adminOrderFilters');
    if (filterBox) {
      filterBox.style.setProperty('display','block','important');
      filterBox.querySelector('.filterHeader')?.style.setProperty('display','none','important');
      ['orderStatusFilter','orderPaymentFilter','orderDateFilter'].forEach(id => {
        document.getElementById(id)?.style.setProperty('display','none','important');
      });
      const search = document.getElementById('orderSearch');
      if (search) {
        search.style.setProperty('display','block','important');
        search.placeholder = '🔎 Pesquisar cliente, pedido, telefone ou endereço...';
        search.oninput = () => filterMotoCards(search.value);
      }
      filterBox.querySelector('.filterGrid')?.style.setProperty('display','block','important');
    }
    document.querySelectorAll('.sideNav [data-page]').forEach(el => {
      const page = el.dataset.page;
      const admin = el.classList.contains('adminOnly') || el.classList.contains('adminDeliveryFeeLink');
      el.style.setProperty('display', allowed.has(page) && !admin ? '' : 'none','important');
    });
    document.querySelectorAll('.sideNav .adminBtn,.sideNav .navTitle,.sideBottom .adminBtn').forEach(el => {
      el.style.setProperty('display','none','important');
    });

    // Após F5/atualização, esconder imediatamente qualquer recurso que não
    // pertence ao perfil de motoboy, inclusive elementos recriados por outras rotinas.
    document.querySelectorAll('.sideNav [data-page]').forEach(el => {
      const page=String(el.dataset.page||'');
      if (!allowed.has(page)) el.style.setProperty('display','none','important');
    });
    document.querySelectorAll('.cartTop,.floatingCart,.homeNotificationBar,.adminTop .adminBtn,.adminOnly,.adminDeliveryFeeLink,[data-role="adminOnly"]').forEach(el=>{
      el.style.setProperty('display','none','important');
    });
    document.querySelectorAll('.page').forEach(page=>{
      const id=String(page.id||'');
      const name=id.replace(/^page-/,'');
      if (id && name && !allowed.has(name)) {
        page.style.setProperty('display','none','important');
      }
    });
    // Exibir somente a página atualmente ativa. Isso evita que Pedidos apareça
    // por baixo/ao rolar a tela de Taxa de entrega.
    const activePage = document.querySelector('.page.activePage')?.id || '';
    const pedidos = document.getElementById('page-pedidos');
    const taxas = document.getElementById('page-taxa-entrega');
    if (pedidos) pedidos.style.setProperty('display', activePage === 'page-pedidos' ? 'block' : 'none','important');
    if (taxas) taxas.style.setProperty('display', activePage === 'page-taxa-entrega' ? 'block' : 'none','important');
  }

  function keepMotoInterfaceClean(){
    if (!isMoto()) return;
    applyMenu();
  }

  function actionButton(o) {
    const status=String(o.status||'').trim().toLowerCase();

    // REGRA DO MOTOBOY:
    // 1) em_preparo = pedido visível, mas ainda sendo preparado. NUNCA mostrar coleta.
    // 2) em_producao = pedido pronto. Somente aqui liberar "Coletar pedido".
    // 3) saiu_entrega = pedido já coletado. Liberar somente "Confirmar entrega".
    if(status==='em_preparo'){
      const refused=String(o.delivery_refused_reason||'').trim();
      if(refused){
        return '<div class="motoWaiting motoRefusedReturn"><div>↩️ <b>Entrega recusada — voltou para Em preparo</b></div><small><b>Motivo:</b> '+esc(refused)+'</small></div>';
      }
      return '<div class="motoWaiting">⏳ Em preparação — aguardando ficar pronto</div>';
    }

    if(status==='em_producao'){
      return '<button type="button" class="motoActionBtn motoCollect" data-order-id="'+esc(o.id)+'" data-action="coletar" onclick="event.preventDefault();event.stopPropagation();window.motoAction(this.dataset.orderId,this.dataset.action,this);return false;">📦 Coletar pedido</button>';
    }

    if(status==='saiu_entrega'){
      return '<div class="motoDeliveryActions"><button type="button" class="motoActionBtn motoDeliver" data-order-id="'+esc(o.id)+'" data-action="entregar" onclick="event.preventDefault();event.stopPropagation();window.motoAction(this.dataset.orderId,this.dataset.action,this);return false;">✅ Confirmar entrega</button><button type="button" class="motoActionBtn motoRefuse" data-order-id="'+esc(o.id)+'" data-action="recusar" onclick="event.preventDefault();event.stopPropagation();window.motoAction(this.dataset.orderId,this.dataset.action,this);return false;">↩️ Entrega recusada</button></div>';
    }

    return '<div class="motoWaiting">⏳ Aguardando liberação</div>';
  }

  async function getOrders() {
    const client = db();
    if (!client) throw new Error('Banco de dados indisponível.');
    const session = await client.auth.getSession();
    const user = session?.data?.session?.user;
    if (!user) throw new Error('Sessão do motoboy não encontrada.');

    const fields = 'id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id,change_for,delivery_refused_reason,delivery_refused_at';
    const results = await Promise.all([
      client.from('orders').select(fields).eq('status','em_preparo').order('created_at',{ascending:false}),
      client.from('orders').select(fields).eq('status','em_producao').order('created_at',{ascending:false}),
      client.from('orders').select(fields).eq('status','saiu_entrega').eq('motoboy_id',user.id).order('created_at',{ascending:false})
    ]);
    const bad = results.find(x => x.error);
    if (bad) throw bad.error;

    const map = new Map();
    results.flatMap(x => x.data || []).forEach(o => map.set(String(o.id),o));
    const rows = [...map.values()].filter(o => !window.BV_MOTO_DELIVERED.has(String(o.id))).sort((a,b) => new Date(b.created_at)-new Date(a.created_at));

    const items = {};
    if (rows.length) {
      const ir = await client.from('order_items').select('order_id,product_id,product_name,quantity').in('order_id',rows.map(x=>x.id));
      if (!ir.error) (ir.data||[]).forEach(i => (items[i.order_id] ||= []).push(i));
    }
    let products={};
    if (rows.length) {
      const ids=[...new Set((Object.values(items).flat()||[]).map(i=>i.product_id).filter(Boolean))];
      if(ids.length){ const pr=await client.from('products').select('id,name,category').in('id',ids); if(!pr.error)(pr.data||[]).forEach(p=>products[p.id]=p); }
    }
    return {rows,items,products};
  }

  function card(o,items,products) {
    const label = o.status === 'saiu_entrega' ? 'Saiu para entrega' : o.status === 'em_producao' ? 'Pronto' : 'Em preparo';
    const groups={Lanches:[],Bebidas:[],Adicionais:[]};
    (items||[]).forEach(i=>{
      const p=products?.[i.product_id]||{};
      const raw=String(p.category||'').trim().toLowerCase();
      const category=raw.includes('beb')?'Bebidas':raw.includes('adicion')?'Adicionais':'Lanches';
      groups[category].push(i);
    });
    const groupHtml=Object.entries(groups).filter(([,arr])=>arr.length).map(([name,arr])=>'<section class="motoItemsGroup"><div class="motoGroupTitle">'+esc(name)+'</div><div class="motoGroupList">'+arr.map(i=>'<div class="motoItemLine"><span class="motoItemQty">'+esc(i.quantity)+'x</span><b class="motoItemName">'+esc(i.product_name||products?.[i.product_id]?.name||'Item')+'</b></div>').join('')+'</div></section>').join('');
    const address = [o.address,o.neighborhood].filter(Boolean).map(esc).join(' · ') || 'Endereço não informado';
    const pm=String(o.payment_method||'').toLowerCase();
    const paymentBadge=pm.includes('dinheiro')?'💵 Dinheiro':pm.includes('cart')?'💳 Cartão':pm.includes('pix')?'🔷 Pix':'';
    return '<article class="motoSingleCard">'+
      '<div class="motoCardTop"><div><small>PEDIDO</small><strong>#'+esc(o.order_number || String(o.id).slice(0,6))+'</strong></div><span>'+label+'</span></div>'+
      '<div class="motoCardBody"><h3>'+esc(o.customer_name || 'Cliente')+'</h3><div class="motoItems">'+(groupHtml||'<small>Itens do pedido não encontrados.</small>')+'</div>'+
      (paymentBadge?'<div class="motoPaymentBadge">'+paymentBadge+(pm.includes('dinheiro')&&Number(o.change_for)>0?'<br><b>Troco para: R$ '+money(o.change_for)+'</b>':'')+'</div>':'')+
      '<div class="motoDeliveryBox"><div><small>📍 ENTREGA</small><b>'+address+'</b></div><div><small>📱 CLIENTE</small><b>'+esc(o.phone || 'Não informado')+'</b></div></div></div>'+
      '<div class="motoFee"><span>Taxa de entrega</span><strong>'+money(o.delivery_fee)+'</strong></div>'+
      '<div class="motoOrderTotal"><span>Valor a ser recebido</span><strong>'+money(o.total)+'</strong></div>'+
      actionButton(o)+'</article>';
  }
  function filterMotoCards(value) {
    if (!isMoto()) return;
    const term=String(value||'').trim().toLowerCase();
    document.querySelectorAll('#orders .motoSingleCard').forEach(card => {
      card.style.display = !term || card.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  }

  window.renderMotoOrders = async function(options) {
    if (!isMoto()) return;
    const now=Date.now();
    const force=options?.force===true;
    if (!force && window.BV_MOTO_RENDER_PROMISE) return window.BV_MOTO_RENDER_PROMISE;
    if (!force && window.BV_MOTO_LAST_RENDER_AT && (now-window.BV_MOTO_LAST_RENDER_AT)<window.BV_MOTO_RENDER_MIN_MS) {
      return;
    }
    if (window.BV_MOTO_RENDER_PROMISE) return window.BV_MOTO_RENDER_PROMISE;
    window.BV_MOTO_LAST_RENDER_AT=now;
    window.BV_MOTO_RENDER_PROMISE=(async()=>{
      const box = $('orders');
      if (!box) return;
      const silent = options?.silent === true;
      const existing = !!box.querySelector('.motoSingleCard,.motoEmpty');
      if (!silent && !existing) box.innerHTML='<div class="motoLoading">⏳ Carregando pedidos...</div>';

    try {
      const {rows,items,products} = await getOrders();
      window.motoCheckNewOrders?.(rows);
      const signature=rows.map(o=>String(o.id)+'|'+String(o.status)+'|'+String(o.motoboy_id||'')).join('§');
      if (signature===window.BV_MOTO_LAST_SIGNATURE && box.querySelector('.motoSingleCard,.motoEmpty')) return;
      window.BV_MOTO_LAST_SIGNATURE=signature;
      if (!rows.length) {
        box.innerHTML='<div class="motoEmpty"><span>🏍️</span><b>Nenhum pedido disponível</b><small>Pedidos em preparo e prontos aparecerão aqui.</small></div>';
        return;
      }
      box.innerHTML=rows.map(o=>card(o,items[o.id]||[],products)).join('');
      const search=document.getElementById('orderSearch');
      if (search) filterMotoCards(search.value);
    } catch(e) {
      console.error('[MOTO PEDIDOS]',e);
      box.innerHTML='<div class="motoEmpty"><span>⚠️</span><b>Erro ao carregar pedidos</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" id="motoRetry">Tentar novamente</button></div>';
      $('motoRetry')?.addEventListener('click',()=>window.renderMotoOrders());
    } finally {
      window.BV_MOTO_RENDER_PROMISE=null;
    }
  })();
  return window.BV_MOTO_RENDER_PROMISE;
  };

  async function askRefusalReason(){
    const reason=window.prompt('Motivo da entrega recusada:');
    if(reason===null)return null;
    const value=String(reason).trim();
    if(!value){window.toast?.('Informe o motivo da entrega recusada.');return null;}
    return value;
  }

  async function doAction(id,action,button,refusalReason=null) {
    if (!isMoto()) return;
    const client=db();
    if (!client) return window.toast?.('Banco de dados indisponível.');

    if(action==='recusar' && !refusalReason){
      const reason=await askRefusalReason();
      if(!reason)return;
      refusalReason=reason;
    }
    const key=String(id)+':'+action;
    if (window.BV_MOTO_ACTIONS.has(key)) return;
    window.BV_MOTO_ACTIONS.add(key);

    if (button) {
      button.disabled=true;
      button.dataset.busy='1';
      button.dataset.oldText=button.textContent;
      button.textContent=action==='coletar'?'⏳ Coletando...':action==='recusar'?'⏳ Recusando...':'⏳ Confirmando...';
    }

    try {
      // A coleta só pode ser iniciada quando o pedido estiver PRONTO
      // (status interno: em_producao). Mesmo que algum botão antigo/cache
      // tente chamar a ação, o front-end bloqueia a coleta antes do RPC.
      if(action==='coletar'){
        const check=await client.from('orders').select('status').eq('id',id).maybeSingle();
        if(check.error) throw check.error;
        const currentStatus=String(check.data?.status||'').trim().toLowerCase();
        if(currentStatus!=='em_producao'){
          throw new Error(currentStatus==='em_preparo'
            ? 'O pedido ainda está em preparação. A coleta será liberada quando estiver pronto.'
            : 'A coleta só está disponível quando o pedido estiver pronto.');
        }
      }

      const session=await client.auth.getSession();
      const user=session?.data?.session?.user;
      if (!user) throw new Error('Sessão expirada. Entre novamente.');

      const rpc=await client.rpc('motoboy_collect_or_deliver',{
        p_order_id:id,
        p_action:action,
        p_refusal_reason:refusalReason
      });
      if (rpc.error) throw rpc.error;
      if (rpc.data !== true) throw new Error('O servidor não confirmou a coleta do pedido.');

      // Atualização otimista da interface: evita que um refresh/realtime concorrente
      // coloque o pedido de volta no estado anterior enquanto o banco termina de propagar.
      const card = button?.closest?.('.motoSingleCard');
      if (action === 'entregar') {
        window.BV_MOTO_DELIVERED.add(String(id));
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(-8px)';
          card.style.transition = 'opacity .18s ease, transform .18s ease';
          setTimeout(() => card.remove(), 180);
        }
      } else if (action === 'recusar') {
        if (card) {
          card.style.opacity='0';
          card.style.transform='translateY(-8px)';
          card.style.transition='opacity .18s ease, transform .18s ease';
          setTimeout(()=>card.remove(),180);
        }
      } else if (card) {
        const badge = card.querySelector('.motoCardTop span');
        if (badge) badge.textContent = 'Saiu para entrega';
        button.dataset.action = 'entregar';
        button.classList.remove('motoCollect');
        button.classList.add('motoDeliver');
        button.textContent = '✅ Confirmar entrega';
        button.disabled = false;
        button.removeAttribute('data-busy');
      }

      // Confirma o estado persistido depois de a alteração ter sido propagada.
      await new Promise(resolve => setTimeout(resolve, 650));
      await window.renderMotoOrders({silent:true});
      if ($('page-taxa-entrega')?.classList.contains('activePage')) {
        await window.renderMotoFeeOrders({silent:true});
      }
      window.toast?.(action==='coletar'?'Pedido coletado. Saiu para entrega.':action==='recusar'?'Entrega recusada. O pedido voltou para Em preparo.':'Entrega confirmada. Pedido removido da tela de pedidos.');
    } catch(e) {
      console.error('[MOTO AÇÃO]',e);
      window.toast?.('Erro ao atualizar pedido: '+String(e?.message||'Tente novamente.').slice(0,180));
      if (button) {
        button.disabled=false;
        button.removeAttribute('data-busy');
        if (button.dataset.oldText) button.textContent=button.dataset.oldText;
      }
    } finally {
      window.BV_MOTO_ACTIONS.delete(key);
    }
  }

  window.motoAction = doAction;
  window.motoFinish = id => doAction(id,'entregar');

  function bindClick() {
    if (window.BV_MOTO_CLICK_READY) return;
    window.BV_MOTO_CLICK_READY=true;
    document.addEventListener('click',e=>{
      const button=e.target?.closest?.('.motoActionBtn');
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      if (button.dataset.busy==='1') return;
      doAction(button.dataset.orderId,button.dataset.action,button);
    },true);
  }

  window.renderMotoFeeOrders = async function(options) {
    if (!isMoto()) return;
    const box=$('motoFeeOrders');
    if (!box) return;
    const silent=options?.silent===true;
    const existing=!!box.querySelector('.motoFeeFilter,.motoFeeList,.emptyState');
    if (!silent && !existing) box.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';

    try {
      const client=db();
      const session=await client.auth.getSession();
      const user=session?.data?.session?.user;
      if (!user) throw new Error('Sessão expirada.');

      const r=await client.from('orders').select('id,order_number,delivery_fee,created_at,motoboy_id,status')
        .eq('status','entregue').eq('motoboy_id',user.id).order('created_at',{ascending:false});
      if (r.error) throw r.error;

      const filter=window.BV_MOTO_FEE_FILTER||'all';
      const now=new Date();
      let rows=r.data||[];
      let start=null,end=null;
      if(filter==='today') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      if(filter==='week'){start=new Date(now.getFullYear(),now.getMonth(),now.getDate());const d=start.getDay();start.setDate(start.getDate()-(d===0?6:d-1));}
      if(filter==='month') start=new Date(now.getFullYear(),now.getMonth(),1);
      if(filter.startsWith('specific:')){const [y,m,d]=filter.slice(9).split('-').map(Number);start=new Date(y,m-1,d);end=new Date(y,m-1,d+1);}
      rows=rows.filter(o=>!start || (new Date(o.created_at)>=start && (!end || new Date(o.created_at)<end)));

      const total=rows.reduce((s,o)=>s+Number(o.delivery_fee||0),0);
      box.innerHTML='<div class="motoFeeFilter"><div class="motoFeeQuickFilters">'+
        ['today:Hoje','week:Esta semana','month:Este mês','all:Todas'].map(x=>{const [v,t]=x.split(':');return '<button type="button" class="'+(filter===v?'active':'')+'" onclick="setMotoFeeFilter(\''+v+'\')">'+t+'</button>';}).join('')+
        '</div><label><span>Data específica</span><input type="date" value="'+(filter.startsWith('specific:')?filter.slice(9):'')+'" onchange="setMotoFeeSpecificDate(this.value)"></label></div>'+
        '<div class="motoFeeHeader"><div><small>ENTREGAS REALIZADAS</small><strong>'+rows.length+'</strong></div><div><small>TOTAL A RECEBER</small><strong>'+money(total)+'</strong></div></div>'+
        (rows.length?'<div class="motoFeeList">'+rows.map(o=>'<article class="motoFeeOrder"><div><small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b><small>DATA</small><b>'+new Date(o.created_at).toLocaleDateString('pt-BR')+'</b></div><div><small>TAXA</small><strong>'+money(o.delivery_fee)+'</strong></div></article>').join('')+'</div>':'<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b></div>');
    } catch(e) {
      console.error('[MOTO TAXAS]',e);
      box.innerHTML='<div class="emptyState"><span>⚠️</span><b>Erro ao carregar taxas</b><small>'+esc(e?.message||'Erro de conexão.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>';
    }
  };

  window.setMotoFeeFilter=filter=>{window.BV_MOTO_FEE_FILTER=filter||'all';window.renderMotoFeeOrders();};
  window.setMotoFeeSpecificDate=value=>{window.BV_MOTO_FEE_FILTER=value?'specific:'+value:'all';window.renderMotoFeeOrders();};

  function injectStyle(){
    if($('bvMotoCleanStyle')) return;
    const s=document.createElement('style');
    s.id='bvMotoCleanStyle';
    s.textContent='.bvMotoNotifyBtn{position:fixed;right:14px;bottom:18px;z-index:99999;border:0;border-radius:999px;padding:12px 16px;background:#e50914;color:#fff;font-weight:900;box-shadow:0 10px 28px rgba(0,0,0,.35);cursor:pointer}.bvMotoIncoming{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:100000;width:min(430px,calc(100vw - 24px));display:flex;align-items:center;gap:12px;padding:15px;border-radius:18px;background:#111;color:#fff;border:2px solid #e50914;box-shadow:0 16px 40px rgba(0,0,0,.5);animation:bvMotoIn .22s ease-out}.bvMotoIncomingIcon{font-size:30px}.bvMotoIncoming div:nth-child(2){flex:1;display:flex;flex-direction:column;gap:3px}.bvMotoIncoming b{color:#ff3340;font-size:13px}.bvMotoIncoming strong{font-size:19px}.bvMotoIncoming small{opacity:.8}.bvMotoIncoming button{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}@keyframes bvMotoIn{from{opacity:0;transform:translate(-50%,-16px)}to{opacity:1;transform:translate(-50%,0)}}.motoSingleCard{margin:0 0 14px;padding:18px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}.motoCardTop,.motoFeeHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.motoCardTop small,.motoInfo small,.motoFeeHeader small{display:block;opacity:.65;font-size:11px}.motoCardTop strong{display:block;font-size:22px}.motoCardTop span{padding:7px 10px;border-radius:10px;background:rgba(229,9,20,.15);font-weight:800;font-size:12px}.motoCardBody h3{margin:16px 0 5px}.motoItems{margin:12px 0 14px}.motoItemsGroup{margin:0 0 10px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.08)}.motoGroupTitle{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#ff3340;margin-bottom:7px}.motoGroupList{display:grid;gap:5px}.motoItemLine{display:grid;grid-template-columns:42px 1fr;gap:8px;align-items:start;font-size:14px;line-height:1.35}.motoItemQty{font-weight:900;opacity:.8}.motoItemName{font-weight:800}.motoCardBody p{margin:0 0 14px}.motoInfo{display:grid;gap:10px}.motoDeliveryBox{display:grid;gap:10px;margin-top:10px;padding:12px 13px;border-radius:13px;background:rgba(229,9,20,.06);border:1px solid rgba(229,9,20,.18)}.motoDeliveryBox small{display:block;font-size:10px;letter-spacing:.12em;opacity:.65;font-weight:900}.motoDeliveryBox b{display:block;margin-top:4px;line-height:1.35}.motoInfo b{display:block;margin-top:3px}.motoFee{display:flex;justify-content:space-between;align-items:center;margin:15px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.16)}.motoFee strong{font-size:18px}.motoOrderTotal{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 15px;padding:14px;border-radius:13px;background:rgba(32,166,90,.12);border:1px solid rgba(32,166,90,.28)}.motoOrderTotal span{font-weight:900}.motoOrderTotal strong{font-size:21px}.motoPaymentBadge{display:inline-flex;align-items:center;gap:6px;margin:4px 0 12px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-weight:900;font-size:14px}.motoActionBtn{width:100%;min-height:48px;border:0;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;pointer-events:auto;touch-action:manipulation}.motoActionBtn:disabled{opacity:.55}.motoCollect{background:linear-gradient(135deg,#e50914,#900007)}.motoDeliver{background:linear-gradient(135deg,#20a65a,#08783b)}.motoLoading,.motoEmpty{padding:35px 18px;text-align:center}.motoEmpty span{display:block;font-size:32px;margin-bottom:8px}.motoEmpty b,.motoEmpty small{display:block}.motoEmpty small{margin:7px 0 14px}.motoFeeFilter{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:16px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03)}.motoFeeQuickFilters{display:flex;gap:8px;flex-wrap:wrap}.motoFeeQuickFilters button{min-height:42px;padding:0 14px;border:1px solid #343a44;border-radius:10px;background:#20242a;color:#fff;font-weight:800}.motoFeeQuickFilters button.active{background:#e50914;border-color:#e50914}.motoFeeFilter label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800}.motoFeeFilter input{min-height:42px;padding:0 12px;border-radius:10px;border:1px solid #343a44;background:#080a0d;color:#fff}.motoFeeHeader{padding:8px 0 16px}.motoFeeHeader>div{display:flex;flex-direction:column;gap:3px}.motoFeeHeader strong{font-size:22px}.motoFeeOrder{display:flex;justify-content:space-between;gap:15px;padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}.motoFeeOrder small{display:block;opacity:.65;margin-top:3px}.motoFeeOrder b,.motoFeeOrder strong{display:block;margin-bottom:7px}.motoPromoBanner{display:none;margin:0 0 18px}.motoPromoBanner.show{display:block}.motoPromoBanner .homePromoSlide{cursor:default}.motoPromoBanner .homePromoCopy{min-width:0}.motoPromoBanner .homePromoTrack{width:100%}';
    document.head.appendChild(s);
  }

  async function boot(){
    // Sempre confirma o papel atual no Supabase antes de montar a área do motoboy.
    // Isso impede que um perfil antigo/cache de administrador abra a tela administrativa.
    const moto=await syncMotoRole();
    if(moto){subscribeMotoNewOrders();installMotoNotifyButton();if(motoAlertsAlreadyEnabled()) finalizeMotoAlerts();}
    applyMenu();
    injectStyle();
    bindClick();
    if(!moto) return;
    window.applyMotoPageChrome?.();
    const active=document.querySelector('.page.activePage')?.id||'';
    if(active==='page-pedidos') await window.renderMotoOrders?.();
    else if(active==='page-taxa-entrega') await window.renderMotoFeeOrders?.();
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));
  const roleClient = db();
  roleClient?.auth?.onAuthStateChange?.(()=>setTimeout(boot,120));
  let cleanTimer=0;
  const scheduleClean=()=>{
    if(!isMoto()) return;
    clearTimeout(cleanTimer);
    cleanTimer=setTimeout(keepMotoInterfaceClean,60);
  };
  const motoCleanObserver=new MutationObserver(scheduleClean);
  document.addEventListener('DOMContentLoaded',()=>motoCleanObserver.observe(document.body,{childList:true,subtree:true}));
  const oldLoad=window.loadApp;
  if(typeof oldLoad==='function' && !window.BV_MOTO_LOAD_WRAPPED){
    window.BV_MOTO_LOAD_WRAPPED=true;
    window.loadApp=async function(){
      const result=await oldLoad.apply(this,arguments);
      setTimeout(boot,150);
      return result;
    };
  }

  // Reaplica uma vez após o carregamento do perfil, sem loop permanente.
  setTimeout(()=>{applyMenu();injectStyle();if(isMoto())applyMotoPageChrome();},300);
})();