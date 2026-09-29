/* BRASABOX - integração completa com Supabase + sincronização em tempo real */
(function(){
  if(!window.supabase || !window.BV_SUPABASE_CONFIG) return;
  const sb=window.supabase.createClient(BV_SUPABASE_CONFIG.url,BV_SUPABASE_CONFIG.publishableKey);
  window.BV_SUPABASE=sb;
  window.BV_DB_READY=true;
  window.BV_DATA_SOURCE='supabase';
  const $=id=>document.getElementById(id);
  let syncing=false;
  let realtimeChannel=null;

  function clearLocalData(){
    const keys=[
      'bv_users','bv_products','bv_orders','bv_cart','bv_config',
      'bv_saved_address','bv_synced_orders','bv_profile','bv_session',
      'bv_current_user','bv_current_order','bv_bairroFees','bv_settings'
    ];
    keys.forEach(k=>localStorage.removeItem(k));
    sessionStorage.clear();
  }

  async function clearAllBVLocalData(){
    // Limpa somente o cache/dados locais do aplicativo. Os dados do Supabase
    // não são apagados e a sessão de autenticação continua preservada.
    try{
      const keep=['supabase.auth.token'];
      Object.keys(localStorage).forEach(k=>{
        const isBV=/^bv/i.test(k);
        const isSupabase=/^supabase|^supa/i.test(k);
        if(isBV || (isSupabase && !keep.includes(k))) localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach(k=>{
        if(/^bv/i.test(k)||/^supabase/i.test(k)||/^supa/i.test(k)) sessionStorage.removeItem(k);
      });

      // Zera também o estado em memória que foi carregado antes deste arquivo.
      try{if(typeof orders!=='undefined')orders=[]}catch(e){}
      try{if(typeof cart!=='undefined')cart=[]}catch(e){}
      try{if(typeof config!=='undefined')config={fee:5,wa:'5531984595968',bairroFees:{}}}catch(e){}
      try{if(typeof saved!=='undefined')saved=null}catch(e){}

      // Remove Cache Storage e service workers antigos, quando existirem.
      if(window.caches&&caches.keys){
        const names=await caches.keys();
        await Promise.all(names.map(n=>caches.delete(n)));
      }
      if(navigator.serviceWorker?.getRegistrations){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
    }catch(e){console.warn('Limpeza local:',e)}
  }

  // Limpeza única do cache antigo do aplicativo. Não remove pedidos do banco.
  // O marcador usa uma versão nova para garantir que aparelhos que já abriram
  // versões anteriores também sejam higienizados uma vez.
  (async()=>{
    const mark='bv_cache_cleanup_v3';
    if(localStorage.getItem(mark)==='1')return;
    await clearAllBVLocalData();
    // Limpa especificamente qualquer rastro de pedidos antigos do navegador.
    ['bv_orders','bv_synced_orders','bv_last_order','bv_last_order_error','bv_current_order'].forEach(k=>localStorage.removeItem(k));
    try{if(typeof orders!=='undefined')orders=[]}catch(e){}
    localStorage.setItem(mark,'1');
    console.info('BrasaBox: cache local antigo limpo. Dados do Supabase preservados.');
  })();

  // Não apagar o armazenamento do Supabase a cada carregamento.
  // A sessão persistente do Supabase fica no localStorage e é necessária
  // para que o administrador continue autenticado entre aparelhos/reloads.

  async function user(){const {data}=await sb.auth.getUser();return data?.user||null}
  async function profile(){
    const u=await user();if(!u)return null;
    const {data,error}=await sb.from('profiles').select('id,name,role').eq('id',u.id).maybeSingle();
    if(error){console.warn('Perfil Supabase:',error.message);return null;}
    if(data){
      // Auto-correção do administrador principal caso um perfil antigo tenha ficado com papel incorreto.
      if(String(u.email||'').toLowerCase()==='admin@brasabox.com' && data.role!=='administrador'){
        const r=await sb.from('profiles').update({role:'administrador',name:data.name||'Administrador'}).eq('id',u.id);
        if(!r.error)data.role='administrador';
      }
      return data;
    }
    // Recupera contas Auth antigas que foram criadas antes do trigger de perfil.
    const isMainAdmin=String(u.email||'').toLowerCase()==='admin@brasabox.com';
    const row={id:u.id,name:u.user_metadata?.name|| (isMainAdmin?'Administrador':'Usuário'),role:isMainAdmin?'administrador':'usuario'};
    const r=await sb.from('profiles').upsert(row,{onConflict:'id'}).select('id,name,role').maybeSingle();
    if(r.error){console.warn('Criação automática do perfil:',r.error.message);return null;}
    return r.data||row;
}
  function session(u,p){if(!u)return;sessionStorage.setItem('bv_user_id',u.id);sessionStorage.setItem('bv_role',p?.role||'usuario');sessionStorage.setItem('bv','0')}

  async function productsDB(){
    const {data,error}=await sb.from('products').select('*').order('created_at',{ascending:true});
    if(error||!Array.isArray(data))return false;
    products=data.filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,price:Number(x.price)||0,emoji:'🍔',desc:x.description||'',category:x.category||'Lanches'}));
    localStorage.bv_products=JSON.stringify(products);
    if($('products') && typeof renderProducts==='function') renderProducts();
    if($('manage') && typeof renderManage==='function') renderManage();
    return true;
  }

  async function settingsDB(){
    const {data,error}=await sb.from('settings').select('id,fee,whatsapp').eq('id',1).maybeSingle();
    if(error)return false;
    if(data){
      config.fee=Number(data.fee)||0;
      config.wa=String(data.whatsapp||config.wa||'');
      localStorage.bv_config=JSON.stringify(config);
      if($('feeCfg'))$('feeCfg').value=String(config.fee||0);
      if($('waCfg'))$('waCfg').value=config.wa||'';
      return true;
    }
    const fee=Number(config.fee)||0;
    const whatsapp=String(config.wa||'');
    const r=await sb.from('settings').upsert({id:1,fee,whatsapp},{onConflict:'id'});
    return !r.error;
  }

  async function feesDB(){
    const {data,error}=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true).order('name');
    if(error||!Array.isArray(data))return false;
    config.bairroFees={};
    data.forEach(x=>config.bairroFees[String(x.name).trim().toLowerCase()]=Number(x.fee)||0);
    localStorage.bv_config=JSON.stringify(config);
    const box=$('bairroFees');
    if(box)box.innerHTML=data.map(x=>`<div class="line"><span>${x.name}</span><b>${brl(x.fee)}</b></div>`).join('')||'<p class="muted">Nenhum bairro cadastrado.</p>';
    return true;
  }

  async function ordersDB(){
    const u=await user();if(!u)return false;
    const p=await profile();
    let q=sb.from('orders').select('*,order_items(*)').order('created_at',{ascending:false});
    // A decisão de visibilidade usa o perfil real do Supabase.
    // sessionStorage é apenas UI e nunca deve decidir acesso aos pedidos.
    const isAdminProfile=!!(p&&['administrador','admin'].includes(p.role));
    const isMotoProfile=!!(p&&p.role==='motoboy');
    if(!(isAdminProfile||isMotoProfile))q=q.eq('user_id',u.id);
    const {data,error}=await q;
    if(error||!Array.isArray(data))return false;
    // Supabase é a fonte oficial. Se não houver pedidos no banco, zera imediatamente qualquer cache antigo.
    if(data.length===0){
      orders=[];
      localStorage.removeItem('bv_orders');
      localStorage.removeItem('bv_synced_orders');
      if(typeof renderAdmin==='function')renderAdmin();
      if(typeof renderTracking==='function')renderTracking();
      return true;
    }
    orders=data.map(o=>({
      id:o.id,customer:o.customer_name,phone:o.phone,
      items:(o.order_items||[]).map(i=>`${i.quantity}x ${i.product_name}`).join(', '),
      total:Number(o.total)||0,
      payment:o.payment_method==='pix'?'Pix':o.payment_method==='cartao'?'Cartão':'Dinheiro',
      delivery:o.address?'Entrega':'Retirada',
      address:o.address?{rua:o.address,numero:'',bairro:o.neighborhood,cep:'',complemento:''}:null,
      status:({recebido:'Novo',em_preparo:'Em preparo',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'}[o.status]||o.status),
      paid:o.payment_status==='pago',time:new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
    }));
    localStorage.bv_orders=JSON.stringify(orders);
    return true;
  }

  async function refreshRealtimeData(){
    if(syncing)return;
    syncing=true;
    try{
      const u=await user();
      if(!u)return;
      // Uma tabela com erro não impede as demais de sincronizarem.
      await Promise.allSettled([productsDB(),feesDB(),ordersDB(),settingsDB()]);
      if(typeof renderAdmin==='function' && (admin()||moto())) renderAdmin();
      if(typeof renderTracking==='function') renderTracking();
      if(typeof applyAccess==='function') applyAccess();
    }finally{syncing=false}
  }

  function startRealtime(){
    startOrderPolling();
    if(realtimeChannel) return;
    realtimeChannel=sb.channel('brasabox-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'neighborhood_fees'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'settings'},()=>refreshRealtimeData())
      .subscribe((status,err)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Realtime BV:',status,err||'');});
  }

  function stopRealtime(){
    if(realtimeChannel){sb.removeChannel(realtimeChannel);realtimeChannel=null;}
    if(orderPoll){clearInterval(orderPoll);orderPoll=null;}
  }

  let orderPoll=null;
  function startOrderPolling(){
    if(orderPoll)clearInterval(orderPoll);
    orderPoll=setInterval(async()=>{
      try{
        const u=await user();
        if(!u)return;
        const p=await profile();
        await ordersDB();
        // Produtos, taxas e configurações também são atualizados periodicamente,
        // para que qualquer aparelho veja as mesmas informações.
        await Promise.allSettled([productsDB(),feesDB(),settingsDB()]);
        if(typeof renderAdmin==='function' && (p&&['administrador','admin','motoboy'].includes(p.role)))renderAdmin();
        if(typeof renderTracking==='function')renderTracking();
      }catch(e){console.warn('Sincronização automática BV:',e)}
    },15000);
  }
  function roleNow(){
    return sessionStorage.getItem('bv_role')||'';
  }

  async function login(){
    const email=($('email')?.value||'').trim().toLowerCase();
    const password=$('pass')?.value||'';
    const err=$('err');
    if(!email||!password){if(err)err.textContent='Digite o e-mail e a senha.';return;}

    // A partir daqui a autenticação do Supabase é a fonte oficial.
    // O login local antigo não pode liberar uma conta administrativa sem sessão
    // real, porque pedidos de outros aparelhos dependem dessa sessão + RLS.
    try{
      const auth=await sb.auth.signInWithPassword({email,password});
      if(!auth.error&&auth.data?.user){
        const p=await profile();
        session(auth.data.user,p);
        await syncAllData();
        startRealtime();
        if($('login'))$('login').style.display='none';
        if(err)err.textContent='';
        applyAccess();
        const target=(p?.role==='administrador'||p?.role==='admin')?'dashboard':p?.role==='motoboy'?'pedidos':'inicio';
        showPage(target);
        toast('Login realizado e sincronizado com o Supabase!');
        return;
      }
      const authMsg=auth.error?.message||'Falha na autenticação.';
      
      // Compatibilidade: contas antigas que só existiam no navegador são
      // migradas para o Auth. Se o projeto exigir confirmação de e-mail,
      // não liberamos o fallback local, pois ele não funciona entre aparelhos.
      let localUser=null;
      try{
        const list=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]');
        if(Array.isArray(list))localUser=list.find(x=>String(x.email||'').trim().toLowerCase()===email&&String(x.pass??'')===password)||null;
      }catch(e){}

      if(localUser){
        const mig=await sb.auth.signUp({email,password,options:{data:{name:localUser.name||'Usuário'}}});
        if(mig.error){
          // Já existe no Auth: tenta novamente para devolver o erro real ao usuário.
          const retry=await sb.auth.signInWithPassword({email,password});
          if(!retry.error&&retry.data?.user){
            const p=await profile();
            session(retry.data.user,p);
            await syncAllData();startRealtime();
            if($('login'))$('login').style.display='none';
            if(err)err.textContent='';
            applyAccess();
            showPage((p?.role==='administrador'||p?.role==='admin')?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
            toast('Login realizado e sincronizado com o Supabase!');
            return;
          }
          const msg=retry.error?.message||mig.error?.message||authMsg;
          if(err)err.textContent='Esta conta ainda não está autenticada no Supabase: '+msg;
          return;
        }
        if(mig.data?.user){
          const pr=await sb.from('profiles').upsert({id:mig.data.user.id,name:localUser.name||'Usuário',role:localUser.role||'usuario'});
          if(pr.error){if(err)err.textContent='Conta criada, mas o perfil não foi salvo: '+pr.error.message;return;}
          if(mig.data.session){
            session(mig.data.user,{id:mig.data.user.id,name:localUser.name||'Usuário',role:localUser.role||'usuario'});
            localUser.id=mig.data.user.id;localUser.supabase=true;delete localUser.pass;
            const list=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]');
            const idx=Array.isArray(list)?list.findIndex(x=>String(x.email||'').toLowerCase()===email):-1;
            if(idx>=0){list[idx]=localUser;localStorage.setItem('bv_users',JSON.stringify(list));}
            await syncAllData();startRealtime();
            if($('login'))$('login').style.display='none';
            if(err)err.textContent='';
            applyAccess();
            showPage((localUser.role==='administrador'||localUser.role==='admin')?'dashboard':localUser.role==='motoboy'?'pedidos':'inicio');
            toast('Conta migrada e sincronizada!');
            return;
          }
          if(err)err.textContent='A conta foi criada no Supabase, mas o e-mail precisa ser confirmado antes do primeiro acesso. Verifique sua caixa de entrada.';
          return;
        }
      }
      if(err)err.textContent='E-mail ou senha incorretos. Verifique a conta no Supabase.';
    }catch(e){
      console.error('Login Supabase:',e);
      if(err)err.textContent='Não foi possível autenticar no Supabase. Tente novamente.';
    }
  }
  async function register(e){
    if(e)e.preventDefault();
    const name=($('registerName')?.value||'').trim(),email=($('registerEmail')?.value||'').trim().toLowerCase(),password=$('registerPass')?.value||'',password2=$('registerPass2')?.value||'',err=$('registerErr');
    if(!name||!email||!password||!password2)return err.textContent='Preencha todos os campos.';
    if(password.length<6)return err.textContent='A senha deve ter pelo menos 6 caracteres.';
    if(password!==password2)return err.textContent='As senhas não coincidem.';
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});
    if(error)return err.textContent=error.message;
    closeRegister();
    if(data.session){const p=await profile();session(data.user,p);startRealtime();$('login').style.display='none';applyAccess();showPage('inicio')}
    else{$('email').value=email;err.textContent='Conta criada. Faça login.'}
    toast('Cadastro salvo no Supabase.');return false;
  }

  async function addProductDB(e){
    if(e)e.preventDefault();
    const name=($('productName')?.value||'').trim(),price=Number($('productPrice')?.value)||0,category=$('productCategory')?.value||'Lanches',description=($('productDesc')?.value||'').trim();
    if(!name||!description)return toast('Preencha nome, valor e descrição.');
    const {error}=await sb.from('products').insert({name,price,category,description,active:true});
    if(error)return toast('Erro: '+error.message);
    await productsDB();closeProductForm();toast('Produto cadastrado no Supabase.');
  }

  async function saveCfgDB(){
    const fee=Number($('feeCfg')?.value)||0;config.fee=fee;config.wa=$('waCfg')?.value||config.wa;
    const localFees=Object.entries(config.bairroFees||{}).map(([name,v])=>({name,fee:Number(v)||0,active:true}));
    if(localFees.length){const r=await sb.from('neighborhood_fees').upsert(localFees,{onConflict:'name'});if(r.error)return toast('Erro ao sincronizar bairros: '+r.error.message);}
    const sr=await sb.from('settings').upsert({id:1,fee,whatsapp:config.wa},{onConflict:'id'});
    if(sr.error)return toast('Bairros salvos, mas as configurações gerais não foram sincronizadas: '+sr.error.message);
    localStorage.bv_config=JSON.stringify(config);await Promise.all([settingsDB(),feesDB()]);toast('Configurações sincronizadas em todos os aparelhos.');
  }

  async function addFeeDB(){
    const name=($('bairroCfg')?.value||'').trim(),fee=Number($('bairroFeeCfg')?.value)||0;
    if(!name)return toast('Informe o bairro.');
    const {error}=await sb.from('neighborhood_fees').upsert({name,fee,active:true},{onConflict:'name'});
    if(error)return toast('Erro ao salvar bairro no servidor: '+error.message);
    config.bairroFees[String(name).toLowerCase()]=fee;localStorage.bv_config=JSON.stringify(config);
    $('bairroCfg').value='';$('bairroFeeCfg').value='';await feesDB();toast('Bairro sincronizado em todos os aparelhos.');
  }

  async function finishDB(){
    if(!cart.length)return toast('Adicione um produto.');
    const u=await user();if(!u)return toast('Faça login para finalizar o pedido.');
    const delivery=$('address')?.style.display!=='none',payment=localStorage.bv_payment||'Pix';
    if(delivery&&(!$('name')?.value||!$('street')?.value||!$('num')?.value||!$('bairro')?.value))return toast('Preencha nome e endereço.');
    if(!delivery&&!$('name')?.value)return toast('Informe seu nome.');
    const pm=payment==='Pix'?'pix':payment==='Cartão'?'cartao':'dinheiro';
    let remoteProducts=[];
    try{
      const pr=await sb.from('products').select('id,name,price,active').eq('active',true);
      if(pr.error)throw pr.error;
      remoteProducts=Array.isArray(pr.data)?pr.data:[];
    }catch(e){return toast('Não foi possível carregar o cardápio do servidor.');}
    const items=cart.map(x=>{
      const rp=remoteProducts.find(p=>String(p.id)===String(x.id))||remoteProducts.find(p=>String(p.name||'').trim().toLowerCase()===String(x.name||'').trim().toLowerCase());
      return {product_id:rp?.id||null,quantity:Number(x.q)||1};
    });
    const missing=items.findIndex(x=>!x.product_id);
    if(missing>=0)return toast('Produto não sincronizado no servidor: '+(cart[missing]?.name||'item'));
    const payload={
      p_customer_name:$('name').value.trim(),
      p_phone:($('phone')?.value||'').trim(),
      p_address:delivery?($('street').value.trim()+', '+$('num').value.trim()+($('comp')?.value.trim()?' — '+$('comp').value.trim():'')):'',
      p_neighborhood:delivery?($('bairro').value||'').trim():'',
      p_payment_method:pm,
      p_coupon:($('coupon')?.value||'').trim().toUpperCase(),
      p_items:items
    };
    const {data:orderId,error}=await sb.rpc('create_bv_order',payload);
    if(error||!orderId){
      console.error('BV pedido RPC:',error);
      return toast('Não foi possível salvar o pedido: '+(error?.message||'erro Supabase'));
    }
    localStorage.bv_last_order=JSON.stringify({id:orderId,phone:$('phone').value||''});
    if(delivery)localStorage.bv_saved_address=JSON.stringify({name:payload.p_customer_name,phone:payload.p_phone,street:$('street').value,num:$('num').value,bairro:$('bairro').value,cep:$('cep').value,comp:$('comp').value});
    cart=[];localStorage.bv_cart='[]';
    await ordersDB();
    if($('trackId'))$('trackId').value=orderId;
    if($('trackPhone'))$('trackPhone').value=payload.p_phone;
    showPage('acompanhar');
    const created=orders.find(x=>String(x.id)===String(orderId));
    renderTracking(created);
    toast('Pedido salvo com segurança no Supabase!');
  }
async function statusDB(id,s){
    const map={'Novo':'recebido','Aguardando pagamento':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};
    const o=orders.find(x=>x.id===id);if(!o)return;
    if(o.payment==='Pix'&&!o.paid&&s!=='Aguardando pagamento')return toast('Confirme o pagamento Pix primeiro.');
    const {error}=await sb.from('orders').update({status:map[s]||s}).eq('id',id);if(error)return toast('Erro ao atualizar pedido.');
    await ordersDB();renderAdmin();toast('Status atualizado.');
  }

  async function pixDB(id){
    const {error}=await sb.from('orders').update({payment_status:'pago',status:'recebido'}).eq('id',id);if(error)return toast('Erro ao confirmar Pix.');
    await ordersDB();renderAdmin();toast('Pix confirmado.');
  }

  function renderUserList(list,box,q=''){
    if(!box)return;
    const filtered=q?list.filter(u=>String(u.name||'').toLowerCase().includes(q)||String(u.email||'').toLowerCase().includes(q)):list;
    if($('userCount'))$('userCount').textContent=list.length+' usuário'+(list.length===1?'':'s');
    if(!filtered.length){
      box.innerHTML='<div class="emptyUsers"><b>Nenhum usuário cadastrado.</b><small>Cadastre uma conta para ela aparecer nesta lista.</small></div>';
      return;
    }
    box.innerHTML=filtered.map((u,i)=>{
      const role=u.role==='administrador'?'🔐 Administrador':u.role==='motoboy'?'🏍️ Motoboy':'👤 Usuário';
      const id=String(u.id||'').replace(/'/g,"\\'");
      return \`<div class="userPerm"><div class="userIndex">\${i+1}</div><div class="userIdentity"><b>\${String(u.name||'Sem nome').replace(/</g,'&lt;')}</b><small>\${String(u.email||'E-mail não disponível').replace(/</g,'&lt;')}</small><em>\${role}</em></div><select onchange="changeUserRole('\${id}',this.value)" \${u.id==='admin-marco'?'disabled':''}><option value="usuario" \${u.role==='usuario'?'selected':''}>👤 Usuário</option><option value="motoboy" \${u.role==='motoboy'?'selected':''}>🏍️ Motoboy</option><option value="administrador" \${u.role==='administrador'?'selected':''}>🔐 Administrador</option></select><button type="button" class="deleteUserBtn" onclick="deleteUser('\${id}')" \${u.id==='admin-marco'?'disabled':''}>🗑 Excluir</button></div>\`;
    }).join('');
  }

  async function createUserDB(){
    if(typeof admin==='function'&&!admin())return toast('Somente o administrador pode cadastrar usuários.');
    const name=$('newUserName')?.value.trim()||'',email=$('newUserEmail')?.value.trim().toLowerCase()||'',pass=$('newUserPass')?.value||'';
    if(!name||!email||!pass)return toast('Preencha nome, e-mail e senha.');
    if(pass.length<6)return toast('A senha deve ter pelo menos 6 caracteres.');
    let local=[];try{local=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){local=[]}
    if(local.some(u=>String(u.email||'').toLowerCase()===email))return toast('Este e-mail já está cadastrado.');
    const {data,error}=await sb.functions.invoke('admin-user',{body:{action:'create',name,email,password:pass,role:'usuario'}});
    if(error||!data?.ok)return toast('Não foi possível cadastrar: '+(data?.error||error?.message||'erro de servidor'));
    local.push({id:data.user_id,name,email,role:'usuario',supabase:true});
    localStorage.setItem('bv_users',JSON.stringify(local));
    if($('newUserName'))$('newUserName').value='';if($('newUserEmail'))$('newUserEmail').value='';if($('newUserPass'))$('newUserPass').value='';
    await usersDB();toast('Usuário cadastrado com segurança no Supabase.');
  }

  async function syncLocalAccounts(){
    // Não cria contas automaticamente nem mantém senhas no navegador.
    // Migração de contas antigas acontece somente no login/cadastro.
    let local=[];try{local=JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    let changed=false;
    local=local.map(u=>{if(u&&Object.prototype.hasOwnProperty.call(u,'pass')){const copy={...u};delete copy.pass;changed=true;return copy}return u});
    if(changed)try{localStorage.setItem('bv_users',JSON.stringify(local))}catch(e){}
  }

  async function syncLocalProducts(){
    let local=[];try{local=JSON.parse(localStorage.getItem('bv_products')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    const {data:remote,error}=await sb.from('products').select('id,name');
    if(error)return;
    const names=new Set((remote||[]).map(x=>String(x.name||'').trim().toLowerCase()));
    for(const p of local){
      const name=String(p.name||'').trim();
      if(!name||names.has(name.toLowerCase()))continue;
      const r=await sb.from('products').insert({name,price:Number(p.price)||0,category:p.category||'Lanches',description:p.desc||'',active:true});
      if(!r.error)names.add(name.toLowerCase());
    }
  }

  async function syncLocalOrders(){
    let local=[];try{local=JSON.parse(localStorage.getItem('bv_orders')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    let done=[];try{done=JSON.parse(localStorage.getItem('bv_synced_orders')||'[]')}catch(e){done=[]}
    if(!Array.isArray(done))done=[];
    const doneSet=new Set(done.map(String));
    for(const o of local){
      const legacyId=String(o.id||'');
      // Registros já vindos do Supabase usam UUID. Não recriar esses pedidos.
      const looksRemoteId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(legacyId);
      if(!legacyId||looksRemoteId||doneSet.has(legacyId))continue;
      const statusMap={'Aguardando pagamento':'recebido','Novo':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};
      const address=o.address&&typeof o.address==='object'?o.address:null;
      const currentUser=await user();
      const orderPayload={
        ...(currentUser?.id?{user_id:currentUser.id}:{}),
        customer_name:o.customer||'Cliente',phone:o.phone||'',address:address?(address.rua||'')+(address.numero?', '+address.numero:''):'',
        neighborhood:address?.bairro||'',delivery_fee:address?Number(config?.bairroFees?.[String(address.bairro||'').toLowerCase()])||0:0,
        subtotal:Number(o.total)||0,total:Number(o.total)||0,payment_method:o.payment==='Pix'?'pix':o.payment==='Cartão'?'cartao':'dinheiro',
        payment_status:o.paid?'pago':'pendente',status:statusMap[o.status]||'recebido',notes:'Migração local '+legacyId
      };
      let ir=await sb.from('orders').insert(orderPayload).select('id').single();
      if(ir.error && Object.prototype.hasOwnProperty.call(orderPayload,'user_id')){
        const retryPayload={...orderPayload};delete retryPayload.user_id;
        ir=await sb.from('orders').insert(retryPayload).select('id').single();
      }
      if(ir.error){console.warn('Pedido local não sincronizado:',legacyId,ir.error.message);continue;}
      if(Array.isArray(o.cart)&&o.cart.length){
        const items=o.cart.map(x=>({order_id:ir.data.id,product_name:x.name,quantity:x.q,unit_price:Number(x.price)||0,total:(Number(x.price)||0)*x.q}));
        await sb.from('order_items').insert(items);
      }
      doneSet.add(legacyId);
    }
    localStorage.setItem('bv_synced_orders',JSON.stringify([...doneSet]));
  }

  async function syncAllData(){
    // Motor de sincronização centralizado: Supabase é a fonte oficial.
    // Primeiro lemos o servidor; só depois migramos dados locais que ainda não existem.
    const result={accounts:false,products:false,fees:false,settings:false,orders:false};
    try{await syncLocalAccounts();result.accounts=true}catch(e){console.warn('Contas:',e)}
    try{
      const r=await productsDB();
      result.products=!!r;
      if(!r)await syncLocalProducts();
      await productsDB();
    }catch(e){console.warn('Produtos:',e)}
    try{
      const r=await feesDB();
      result.fees=true;
      if(!r)await syncLocalBairros();
      await feesDB();
    }catch(e){console.warn('Taxas:',e)}
    try{
      const r=await settingsDB();
      result.settings=!!r;
    }catch(e){console.warn('Configurações:',e)}
    try{
      const r=await ordersDB();
      result.orders=!!r;
      // Migra pedidos antigos do navegador somente quando o servidor puder ser lido.
      // Nunca usa o localStorage como fonte principal nem duplica registros já sincronizados.
      // Supabase é a única fonte de pedidos. Não reimporta registros antigos do navegador.
      // Isso evita que pedidos apagados do servidor reapareçam.
      await ordersDB();
    }catch(e){console.warn('Pedidos:',e)}
    window.BV_SYNC_STATUS={...result,lastSync:new Date().toISOString()};
    return result;
  }

  async function syncLocalBairros(){
    const local=config?.bairroFees||{};const rows=Object.entries(local).map(([name,fee])=>({name,fee:Number(fee)||0,active:true}));
    if(!rows.length)return;
    const r=await sb.from('neighborhood_fees').upsert(rows,{onConflict:'name'});
    if(!r.error)await feesDB();
  }

  async function usersDB(){
    const box=$('userPermissions');if(!box)return;
    try{await syncLocalAccounts();await syncLocalBairros()}catch(e){console.warn('Sincronização inicial:',e)}
    const q=String($('userSearch')?.value||'').trim().toLowerCase();

    // Primeiro mostra imediatamente os usuários locais. Assim a tela nunca fica vazia
    // esperando uma resposta do Supabase.
    let localUsers=[];
    try{
      localUsers=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]');
    }catch(e){localUsers=[]}
    if(!Array.isArray(localUsers))localUsers=[];
    renderUserList(localUsers,box,q);

    // Depois tenta complementar a lista com os perfis do Supabase.
    try{
      const res=await sb.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:false});
      if(res.error||!Array.isArray(res.data))return;
      const merged=[...res.data];
      localUsers.forEach(u=>{
        if(!merged.some(x=>String(x.id||'')===String(u.id||'') || (u.email&&x.email&&String(x.email).toLowerCase()===String(u.email).toLowerCase()))){
          merged.push(u);
        }
      });
      renderUserList(merged,box,q);
    }catch(e){
      console.warn('Usuários do Supabase indisponíveis; mantendo lista local.',e);
    }
  }
  window.deleteUser=async(id)=>{
    const uid=String(id||'');
    if(!uid)return toast('Usuário inválido.');
    const current=String(sessionStorage.getItem('bv_user_id')||'');
    if(current===uid)return toast('Você não pode excluir a própria conta por aqui.');
    let list=[];try{list=JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){list=[]}
    const target=Array.isArray(list)?list.find(u=>String(u.id||'')===uid):null;
    const label=target?.name||target?.email||'este usuário';
    if(!confirm('Excluir '+label+'?\\n\\nA conta será removida do Auth e do perfil.'))return;
    const {data,error}=await sb.functions.invoke('admin-user',{body:{action:'delete',user_id:uid}});
    if(error||!data?.ok)return toast('Não foi possível excluir: '+(data?.error||error?.message||'erro de servidor'));
    localStorage.setItem('bv_users',JSON.stringify(Array.isArray(list)?list.filter(u=>String(u.id||'')!==uid):[]));
    await usersDB();toast('Usuário excluído do sistema.');
  };
  window.changeUserRole=async(id,role)=>{const {error}=await sb.from('profiles').update({role}).eq('id',id);if(error)return toast('Não foi possível alterar a permissão.');toast('Permissão atualizada.');usersDB()};
  window.login=login;window.registerUser=register;window.createUser=createUserDB;window.addProduct=addProductDB;window.saveCfg=saveCfgDB;window.addBairroFee=addFeeDB;window.finish=finishDB;window.statusOrder=statusDB;window.confirmPix=pixDB;window.renderUsers=usersDB;window.syncAllData=syncAllData;
  const oldLogout=window.logout;
  window.logout=async()=>{stopRealtime();try{await sb.auth.signOut()}catch(e){}if(oldLogout)oldLogout()};

  sb.auth.getSession().then(async({data})=>{
    if(!data.session)return;
    const p=await profile();session(data.session.user,p);
    await Promise.all([productsDB(),feesDB(),ordersDB()]);
    startRealtime();$('login').style.display='none';applyAccess();showPage(p?.role==='administrador'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
  });

  sb.auth.onAuthStateChange(async(ev,s)=>{
    if(ev==='SIGNED_OUT'||!s||syncing)return;
    syncing=true;
    try{const p=await profile();session(s.user,p);await Promise.all([productsDB(),feesDB(),ordersDB()]);startRealtime()}
    finally{syncing=false}
  });
})();
