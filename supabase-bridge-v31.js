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
  let motoboys=[];

  function clearLocalData(){
    const keys=[
      'bv_users','bv_products','bv_orders','bv_cart',
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
      try{if(typeof config!=='undefined'){const keep=config.bairroFees||{};config={...config,bairroFees:keep}}}catch(e){}
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

  // O aplicativo não limpa mais localStorage/sessionStorage automaticamente.\n  // Isso preserva a sessão do Supabase e impede que o login seja apagado durante o carregamento.\n\n  // Não apagar o armazenamento do Supabase a cada carregamento.
  // A sessão persistente do Supabase fica no localStorage e é necessária
  // para que o administrador continue autenticado entre aparelhos/reloads.

  async function user(){const {data}=await sb.auth.getUser();return data?.user||null}
  async function profile(){
    const u=await user();if(!u)return null;
    const {data,error}=await sb.from('profiles').select('id,name,role').eq('id',u.id).maybeSingle();
    if(error){console.warn('Perfil Supabase:',error.message);return null;}
    if(data){
      // Auto-correção do administrador principal caso um perfil antigo tenha ficado com papel incorreto.
      if((String(u.email||'').toLowerCase()==='marco@brasabox.com'||String(u.email||'').toLowerCase()==='marco@brasabox.com') && data.role!=='administrador'){
        const r=await sb.from('profiles').update({role:'administrador',name:data.name||'Administrador'}).eq('id',u.id);
        if(!r.error)data.role='administrador';
      }
      return data;
    }
    // Recupera contas Auth antigas que foram criadas antes do trigger de perfil.
    const isMainAdmin=(String(u.email||'').toLowerCase()==='marco@brasabox.com'||String(u.email||'').toLowerCase()==='admin@brasabox.com');
    const row={id:u.id,name:u.user_metadata?.name|| (isMainAdmin?'Administrador':'Usuário'),role:isMainAdmin?'administrador':'usuario'};
    const r=await sb.from('profiles').upsert(row,{onConflict:'id'}).select('id,name,role').maybeSingle();
    if(r.error){console.warn('Criação automática do perfil:',r.error.message);return null;}
    return r.data||row;
}
  function session(u,p){if(!u)return;const email=String(u.email||'').trim().toLowerCase();const mainAdmin=email==='marco@brasabox.com'||email==='admin@brasabox.com';const resolvedRole=mainAdmin?'administrador':(p?.role||(email==='cliente@bv.com'?'motoboy':'usuario'));const displayName=String(p?.name||u.user_metadata?.name||email.split('@')[0]||'Usuário').trim();sessionStorage.setItem('bv_user_id',u.id);sessionStorage.setItem('bv_user_name',displayName);sessionStorage.setItem('bv_user_email',email);sessionStorage.setItem('bv_role',resolvedRole);sessionStorage.setItem('bv',resolvedRole==='administrador'?'1':'0');const nameBox=document.getElementById('loggedUserName');if(nameBox)nameBox.textContent=displayName}

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

  window.refreshDeliveryFeeForNeighborhood=async function(name){const raw=String(name||'').trim();if(!raw)return null;const norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');try{const {data,error}=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true);if(error){console.warn('Taxa do bairro:',error.message);return Number(config.fee)||0}if(!Array.isArray(data))return Number(config.fee)||0;const wanted=norm(raw);const hit=data.find(x=>norm(x.name)===wanted);return hit?Number(hit.fee)||0:Number(config.fee)||0}catch(e){console.warn('Taxa do bairro:',e);return Number(config.fee)||0}};window.refreshDeliveryFees=async function(){try{return await feesDB()}catch(e){console.warn('Taxas:',e);return false}};
  async function feesDB(){
    // O banco é a fonte oficial. A migração local só ocorre se o servidor ainda não possuir taxas.
    let {data,error}=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true).order('name');
    if(!error && Array.isArray(data) && data.length===0){
      let local={};try{local=JSON.parse(localStorage.getItem('bv_config')||'{}').bairroFees||{}}catch(e){local={}}
      const rows=Object.entries(local).filter(([name,fee])=>String(name).trim()&&Number(fee)>=0).map(([name,fee])=>({name:String(name).trim(),fee:Number(fee)||0,active:true}));
      if(rows.length){
        const wr=await sb.from('neighborhood_fees').upsert(rows,{onConflict:'name'});
        if(!wr.error){const rr=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true).order('name');data=rr.data;error=rr.error}
      }
    }
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
    if(isAdminProfile){
      const mr=await sb.from('profiles').select('id,name').eq('role','motoboy').order('name');
      motoboys=(!mr.error&&Array.isArray(mr.data))?mr.data:[];
      window.BV_MOTOBOYS=motoboys;
    }else if(isMotoProfile){
      q=q.eq('motoboy_id',u.id).eq('status','em_producao');
    }else{
      q=q.eq('user_id',u.id);
    }
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
      id:o.id,orderNumber:o.order_number,created_at:o.created_at,customer:o.customer_name,phone:o.phone,
      motoboy_id:o.motoboy_id||null,
      deliveryFee:Number(o.delivery_fee)||0,
      deliveryFeeCollected:!!o.delivery_fee_collected,
      items:(o.order_items||[]).map(i=>`${i.quantity}x ${i.product_name}`).join(', '),
      total:Number(o.total)||0,
      payment:o.payment_method==='pix'?'Pix':o.payment_method==='cartao'?'Cartão':'Dinheiro',
      delivery:o.address?'Entrega':'Retirada',
      address:o.address?{rua:o.address,numero:'',bairro:o.neighborhood,cep:'',complemento:''}:null,
      status:({recebido:'Novo',em_preparo:'Em preparo',em_producao:'Em produção',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'}[o.status]||o.status),
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
      const p=await profile();
      session(u,p);
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
        if(p&&['administrador','admin'].includes(p.role)){try{await syncLocalBairros()}catch(e){console.warn('Migração das taxas:',e)}}
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
            if(p&&['administrador','admin'].includes(p.role)){try{await syncLocalBairros()}catch(e){console.warn('Migração das taxas:',e)}}
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

  async function deleteProductDB(id){
    const pid=String(id||'').trim();if(!pid)return toast('Produto inválido.');
    if(!admin())return toast('Somente o administrador pode excluir produtos.');
    if(!confirm('Excluir este produto do cardápio?'))return;
    const {error}=await sb.from('products').delete().eq('id',pid);
    if(error)return toast('Não foi possível excluir o produto: '+error.message);
    await productsDB();toast('Produto excluído do Supabase.');
  }

  async function addProductDB(e){
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    try{
      if(!admin())return toast('Somente o administrador pode cadastrar produtos.');
      const {data:{user:currentUser}}=await sb.auth.getUser();
      if(!currentUser)return toast('Sua sessão expirou. Faça login novamente.');
      const name=String($('productName')?.value||'').trim();
      const rawPrice=$('productPrice')?.value;
      const price=Number(rawPrice);
      const category=$('productCategory')?.value||'Lanches';
      const description=String($('productDesc')?.value||'').trim();
      if(!name)return toast('Informe o nome do produto.');
      if(!Number.isFinite(price)||price<0)return toast('Informe um valor válido.');
      if(!description)return toast('Informe a descrição do produto.');
      const {error}=await sb.from('products').insert({name,price,category,description,active:true});
      if(error)return toast('Erro ao cadastrar: '+error.message);
      await productsDB();
      if($('productName'))$('productName').value='';
      if($('productPrice'))$('productPrice').value='';
      if($('productCategory'))$('productCategory').value='Lanches';
      if($('productDesc'))$('productDesc').value='';
      closeProductForm();
      toast('Produto cadastrado com sucesso!');
    }catch(err){
      console.error('Cadastro de produto:',err);
      toast('Não foi possível cadastrar o produto.');
    }
  }

  async function saveCfgDB(){
    const fee=Number($('feeCfg')?.value)||0;config.fee=fee;config.wa=$('waCfg')?.value||config.wa;
    const localFees=Object.entries(config.bairroFees||{}).map(([name,v])=>({name,fee:Number(v)||0,active:true}));
    if(localFees.length){const r=await sb.from('neighborhood_fees').upsert(localFees,{onConflict:'name'});if(r.error)return toast('Erro ao sincronizar bairros: '+r.error.message);}
    const sr=await sb.from('settings').upsert({id:1,fee,whatsapp:config.wa},{onConflict:'id'});
    if(sr.error)return toast('Bairros salvos, mas as configurações gerais não foram sincronizadas: '+sr.error.message);
    localStorage.bv_config=JSON.stringify(config);await Promise.all([settingsDB(),feesDB()]);toast('Configurações sincronizadas em todos os aparelhos.');
  }

  async function updateFeeDB(name,fee){const oldName=String(name||'').trim();const value=Number(fee);if(!oldName||!Number.isFinite(value)||value<0)return toast('Taxa inválida.');const {error}=await sb.from('neighborhood_fees').update({fee:value,active:true}).eq('name',oldName);if(error)return toast('Erro ao atualizar bairro: '+error.message);config.bairroFees[oldName.toLowerCase()]=value;localStorage.bv_config=JSON.stringify(config);await feesDB();toast('Taxa do bairro atualizada em todos os aparelhos.')}async function deleteFeeDB(name){const oldName=String(name||'').trim();if(!oldName)return;if(!confirm('Excluir a taxa do bairro '+oldName+'?'))return;const {error}=await sb.from('neighborhood_fees').delete().eq('name',oldName);if(error)return toast('Erro ao excluir bairro: '+error.message);delete config.bairroFees[oldName.toLowerCase()];localStorage.bv_config=JSON.stringify(config);await feesDB();toast('Bairro excluído em todos os aparelhos.')}

  async function addFeeDB(){
    const name=($('bairroCfg')?.value||'').trim(),fee=Number($('bairroFeeCfg')?.value)||0;
    if(!name)return toast('Informe o bairro.');
    const {error}=await sb.from('neighborhood_fees').upsert({name,fee,active:true},{onConflict:'name'});
    if(error)return toast('Erro ao salvar bairro no servidor: '+error.message);
    config.bairroFees[String(name).toLowerCase()]=fee;localStorage.bv_config=JSON.stringify(config);
    $('bairroCfg').value='';$('bairroFeeCfg').value='';await feesDB();toast('Bairro sincronizado em todos os aparelhos.');
  }

  async function finishDB(){
    try{
      if(!Array.isArray(cart)||!cart.length)return toast('Adicione um produto.');
      const u=await user();
      if(!u)return toast('Faça login para finalizar o pedido.');
      const delivery=$('address')?.style.display!=='none';
      const payment=localStorage.bv_payment||'Pix';
      if(delivery&&(!$('name')?.value||!$('street')?.value||!$('num')?.value||!$('bairro')?.value))return toast('Preencha nome e endereço.');
      if(!delivery&&!$('name')?.value)return toast('Informe seu nome.');
      const pm=payment==='Pix'?'pix':payment==='Cartão'?'cartao':'dinheiro';

      let remoteProducts=[];
      const pr=await sb.from('products').select('id,name,price,active').eq('active',true);
      if(pr.error)return toast('Não foi possível consultar o cardápio. Tente novamente.');
      remoteProducts=Array.isArray(pr.data)?pr.data:[];
      const items=cart.map(x=>{
        const rp=remoteProducts.find(p=>String(p.id)===String(x.id))
          ||remoteProducts.find(p=>String(p.name||'').trim().toLowerCase()===String(x.name||'').trim().toLowerCase());
        return {product_id:rp?.id||null,quantity:Math.max(1,Number(x.q)||1)};
      });
      const missing=items.findIndex(x=>!x.product_id);
      if(missing>=0)return toast('O produto '+(cart[missing]?.name||'item')+' não está disponível no cardápio.');
      const payload={
        p_customer_name:String($('name')?.value||'').trim(),
        p_phone:String($('phone')?.value||'').trim(),
        p_address:delivery?String(($('street')?.value||'').trim()+', '+($('num')?.value||'').trim()+(($('comp')?.value||'').trim()?' — '+$('comp').value.trim():'')):'',
        p_neighborhood:delivery?String($('bairro')?.value||'').trim():'',
        p_payment_method:pm,
        p_coupon:String($('coupon')?.value||'').trim().toUpperCase(),
        p_items:items
      };
      const {data:orderId,error}=await sb.rpc('create_bv_order',payload);
      if(error||!orderId){
        console.error('BV pedido RPC:',error,payload,items);
        const msg=String(error?.message||error?.details||error?.hint||'').replace(/\s+/g,' ').trim();
        return toast(msg?('Erro ao finalizar: '+msg.slice(0,120)):'Não foi possível finalizar o pedido. Tente novamente.');
      }
      localStorage.bv_last_order=JSON.stringify({id:orderId,phone:payload.p_phone});
      if(delivery)localStorage.bv_saved_address=JSON.stringify({name:payload.p_customer_name,phone:payload.p_phone,street:$('street').value,num:$('num').value,bairro:$('bairro').value,cep:$('cep').value,comp:$('comp').value});
      cart=[];localStorage.bv_cart='[]';
      await ordersDB();
      if($('trackId'))$('trackId').value=orderId;
      if($('trackPhone'))$('trackPhone').value=payload.p_phone;
      showPage('acompanhar');
      renderTracking(orders.find(x=>String(x.id)===String(orderId)));
      toast('Pedido finalizado com sucesso!');
    }catch(e){
      console.error('Finalização BV:',e);
      toast('Erro ao finalizar pedido. Verifique sua conexão e tente novamente.');
    }
  }

  async function statusDB(id,s){
    const map={'Novo':'recebido','Aguardando pagamento':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Em produção':'em_producao','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};
    const o=orders.find(x=>x.id===id);if(!o)return;
    if(o.payment==='Pix'&&!o.paid&&s!=='Aguardando pagamento')return toast('Confirme o pagamento Pix primeiro.');
    if((s==='Em produção'||s==='Saiu para entrega')&&!o.motoboy_id)return toast('Selecione um motoboy antes de colocar este pedido para entrega.');
    const {error}=await sb.from('orders').update({status:map[s]||s}).eq('id',id);if(error)return toast('Erro ao atualizar pedido: '+error.message);
    await ordersDB();renderAdmin();if(typeof window.renderFilteredOrders==='function')window.renderFilteredOrders();
      window.renderMotoFeeOnly=function(){
    const box=document.getElementById('motoFeeOrders'); if(!box)return;
    if(!moto()||admin()){box.innerHTML='<p class="muted">Acesso exclusivo para motoboys.</p>';return}
    const uid=String(sessionStorage.getItem('bv_user_id')||'');
    const list=(Array.isArray(orders)?orders:[]).filter(o=>String(o.motoboy_id||'')===uid&&o.status==='Em produção');
    if(!list.length){box.innerHTML='<div class="emptyFilter motoEmpty"><b>Nenhuma taxa de entrega pendente.</b><small>As taxas das entregas atribuídas a você aparecerão aqui.</small></div>';return}
    const pending=list.filter(o=>!o.deliveryFeeCollected).reduce((s,o)=>s+(Number(o.deliveryFee)||0),0);
    box.innerHTML='<div class="motoDeliverySummary"><div><small>Entregas</small><b>'+list.length+'</b></div><div><small>Taxas a receber</small><b>'+brl(pending)+'</b></div></div>'+list.map(o=>{
      const fee=Number(o.deliveryFee)||0, adr=o.address?esc((o.address.rua||'')+', '+(o.address.numero||'')+' — '+(o.address.bairro||'')):'Retirada no local';
      const action=o.deliveryFeeCollected?'<div class="feeCollected">✓ Taxa marcada como recebida</div>':'<button class="motoFeeBtn" type="button" onclick="markDeliveryFee(\''+String(o.id).replace(/'/g,"\\'")+'\')">💰 Marcar taxa recebida · '+brl(fee)+'</button>';
      return '<div class="order motoOrder"><div class="line"><b>#'+esc(o.id)+' — '+esc(o.customer)+'</b><span class="status">'+esc(o.status)+'</span></div><p>📍 '+adr+'</p><p>📞 '+esc(o.phone||'Não informado')+'</p><div class="motoFeeCard"><span>Taxa de entrega</span><strong>'+brl(fee)+'</strong></div>'+action+'</div>';
    }).join('');
  };toast('Status atualizado.');
  }

  async function assignMotoboyDB(id,motoboyId){
    if(!id)return;
    const value=String(motoboyId||'').trim()||null;
    const {error}=await sb.from('orders').update({motoboy_id:value}).eq('id',id);
    if(error)return toast('Não foi possível atribuir o motoboy: '+error.message);
    await ordersDB();renderAdmin();if(typeof window.renderFilteredOrders==='function')window.renderFilteredOrders();
    toast(value?'Pedido atribuído ao motoboy.':'Motoboy removido do pedido.');
  }

  async function markDeliveryFeeDB(id){
    const {data,error}=await sb.rpc('motoboy_update_delivery',{p_order_id:id,p_fee_collected:true,p_mark_delivered:false});
    if(error||data!==true)return toast('Não foi possível marcar a taxa: '+(error?.message||'erro'));
    await ordersDB();renderAdmin();if(typeof window.renderFilteredOrders==='function')window.renderFilteredOrders();toast('Taxa de entrega marcada como recebida.');
  }

  async function finishMotoDeliveryDB(id){
    const {data,error}=await sb.rpc('motoboy_update_delivery',{p_order_id:id,p_fee_collected:true,p_mark_delivered:true});
    if(error||data!==true)return toast('Não foi possível finalizar a entrega: '+(error?.message||'erro'));
    await ordersDB();renderAdmin();if(typeof window.renderFilteredOrders==='function')window.renderFilteredOrders();toast('Entrega finalizada.');
  }

  async function deleteOrderDB(id){const oid=String(id||'').trim();if(!oid)return toast('Pedido inválido.');const o=orders.find(x=>String(x.id)===oid);if(!o)return toast('Pedido não encontrado.');if(!confirm('Excluir o pedido #'+oid+'?'))return;const child=await sb.from('order_items').delete().eq('order_id',oid);if(child.error)return toast('Não foi possível excluir os itens: '+child.error.message);const r=await sb.from('orders').delete().eq('id',oid);if(r.error)return toast('Não foi possível excluir o pedido: '+r.error.message);await ordersDB();renderAdmin();if(typeof window.renderFilteredOrders==='function')window.renderFilteredOrders();toast('Pedido excluído.')}

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
      return `<div class="userPerm"><div class="userIndex">${i+1}</div><div class="userIdentity"><b>${String(u.name||'Sem nome').replace(/</g,'&lt;')}</b><small>${String(u.email||'E-mail não disponível').replace(/</g,'&lt;')}</small><em>${role}</em></div><select onchange="changeUserRole('${id}',this.value)" ${String(u.id)===String(sessionStorage.getItem('bv_user_id')||'')?'disabled':''}><option value="usuario" ${u.role==='usuario'?'selected':''}>👤 Usuário</option><option value="motoboy" ${u.role==='motoboy'?'selected':''}>🏍️ Motoboy</option><option value="administrador" ${u.role==='administrador'?'selected':''}>🔐 Administrador</option></select><button type="button" class="deleteUserBtn" onclick="deleteUser('${id}')" ${String(u.id)===String(sessionStorage.getItem('bv_user_id')||'')?'disabled':''}>🗑 Excluir</button></div>`;
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
    const q=String($('userSearch')?.value||'').trim().toLowerCase();
    try{
      const {data,error}=await sb.functions.invoke('admin-user',{body:{action:'list'}});
      if(error||!data?.ok||!Array.isArray(data.users)){
        console.warn('Lista de usuários:',error||data?.error||'resposta inválida');
        if($('userCount'))$('userCount').textContent='0 usuários';
        renderUserList([],box,q);
        return;
      }
      // A lista administrativa usa somente contas reais do Supabase Auth.
      // Contas locais antigas (ex.: "user-demo") não podem receber permissões nem ser excluídas no servidor.
      // Também ocultamos contas legadas substituídas durante a migração para evitar duplicidade no painel.
      const list=data.users
        .filter(u=>u&&u.id)
        .map(u=>({
          id:String(u.id),
          name:String(u.name||'Usuário'),
          email:String(u.email||''),
          role:['administrador','motoboy','usuario'].includes(u.role)?u.role:'usuario',
          supabase:true
        }))
        .sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR'));
      window.BV_USERS=list;
      renderUserList(list,box,q);
    }catch(e){
      console.warn('Usuários do Supabase indisponíveis:',e);
      renderUserList([],box,q);
    }
  }
  window.deleteUser=async(id)=>{
    const uid=String(id||'');
    if(!uid)return toast('Usuário inválido.');
    const current=String(sessionStorage.getItem('bv_user_id')||'');
    if(current===uid)return toast('Você não pode excluir a própria conta por aqui.');
    const list=Array.isArray(window.BV_USERS)?window.BV_USERS:[];
    const target=list.find(u=>String(u.id||'')===uid);
    const label=target?.name||target?.email||'este usuário';
    if(!confirm('Excluir '+label+'?\\n\\nA conta será removida do Auth e do perfil.'))return;
    const {data,error}=await sb.functions.invoke('admin-user',{body:{action:'delete',user_id:uid}});
    if(error||!data?.ok)return toast('Não foi possível excluir: '+(data?.error||error?.message||'erro de servidor'));
    localStorage.setItem('bv_users',JSON.stringify(Array.isArray(list)?list.filter(u=>String(u.id||'')!==uid):[]));
    await usersDB();toast('Usuário excluído do sistema.');
  };
  window.changeUserRole=async(id,role)=>{if(!admin())return toast('Somente o administrador pode alterar permissões.');if(String(id)===String(sessionStorage.getItem('bv_user_id')))return toast('Você não pode alterar a própria permissão por aqui.');if(!['usuario','motoboy','administrador'].includes(role))return toast('Permissão inválida.');const {data,error}=await sb.functions.invoke('admin-user',{body:{action:'role',user_id:id,role}});if(error||!data?.ok)return toast('Não foi possível alterar a permissão: '+(data?.error||error?.message||'erro de servidor'));toast('Permissão atualizada.');await usersDB()};
  /* BRASABOX — camada de recuperação 2026.09.23
     Corrige operações de bairros/taxas, evita duplicidade por diferença de maiúsculas
     e mantém o checkout independente de RPCs antigos. */
  const bvNormFeeName=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ');
  const bvEscFee=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function bvReloadFeesUI(){
    const {data,error}=await sb.from('neighborhood_fees').select('id,name,fee,active').order('name');
    if(error){console.error('BV taxas:',error);return false;}
    const active=(data||[]).filter(x=>x.active!==false);
    config.bairroFees={};
    active.forEach(x=>{config.bairroFees[String(x.name).trim().toLowerCase()]=Number(x.fee)||0;});
    try{localStorage.bv_config=JSON.stringify(config)}catch(e){}
    const box=$('bairroFees');
    if(box){
      box.innerHTML=active.map(x=>'<div class="feeRow"><div><b>'+bvEscFee(x.name)+'</b><small>'+brl(x.fee)+'</small></div><div class="feeActions"><button type="button" onclick="updateBairroFee(\''+String(x.name).replace(/\\/g,'\\\\').replace(/'/g,"\\\\'")+'\')">✏️ Editar</button><button type="button" class="feeDelete" onclick="deleteBairroFee(\''+String(x.name).replace(/\\/g,'\\\\').replace(/'/g,"\\\\'")+'\')">🗑 Excluir</button></div></div>').join('')||'<p class="muted">Nenhum bairro cadastrado.</p>';
    }
    return true;
  }

  window.addBairroFee=async function(){
    const name=String($('bairroCfg')?.value||'').trim();
    const raw=String($('bairroFeeCfg')?.value??'').trim().replace(',','.');
    const value=Number(raw);
    if(!name||!Number.isFinite(value)||value<0)return toast('Informe um bairro e uma taxa válida.');
    try{
      const {data,error}=await sb.from('neighborhood_fees').select('id,name').limit(500);
      if(error)throw error;
      const wanted=bvNormFeeName(name);
      const existing=(data||[]).find(x=>bvNormFeeName(x.name)===wanted);
      let res;
      if(existing)res=await sb.from('neighborhood_fees').update({name:existing.name,fee:value,active:true}).eq('id',existing.id);
      else res=await sb.from('neighborhood_fees').insert({name,fee:value,active:true});
      if(res.error)throw res.error;
      $('bairroCfg').value='';$('bairroFeeCfg').value='';
      await bvReloadFeesUI();
      if(typeof refreshNeighborhoodFee==='function')refreshNeighborhoodFee();
      toast(existing?'Taxa do bairro atualizada.':'Bairro cadastrado com sucesso.');
    }catch(e){console.error('BV adicionar taxa:',e);toast('Não foi possível salvar a taxa: '+(e.message||'erro no servidor'))}
  };

  window.updateBairroFee=async function(name){
    const rawName=String(name||'').trim();
    if(!rawName)return;
    try{
      const {data,error}=await sb.from('neighborhood_fees').select('id,name,fee').limit(500);
      if(error)throw error;
      const row=(data||[]).find(x=>bvNormFeeName(x.name)===bvNormFeeName(rawName));
      if(!row)return toast('Bairro não encontrado no servidor.');
      const answer=prompt('Nova taxa para '+row.name+':',String(Number(row.fee||0).toFixed(2)).replace('.',','));
      if(answer===null)return;
      const value=Number(String(answer).trim().replace(',','.'));
      if(!Number.isFinite(value)||value<0)return toast('Informe uma taxa válida.');
      const res=await sb.from('neighborhood_fees').update({fee:value,active:true}).eq('id',row.id);
      if(res.error)throw res.error;
      await bvReloadFeesUI();
      if(typeof refreshNeighborhoodFee==='function')refreshNeighborhoodFee();
      toast('Taxa atualizada com sucesso.');
    }catch(e){console.error('BV atualizar taxa:',e);toast('Não foi possível atualizar: '+(e.message||'erro no servidor'))}
  };

  window.deleteBairroFee=async function(name){
    const rawName=String(name||'').trim();
    if(!rawName)return;
    if(!confirm('Excluir a taxa do bairro '+rawName+'?'))return;
    try{
      const {data,error}=await sb.from('neighborhood_fees').select('id,name').limit(500);
      if(error)throw error;
      const row=(data||[]).find(x=>bvNormFeeName(x.name)===bvNormFeeName(rawName));
      if(!row)return toast('Bairro já não existe no servidor.');
      const res=await sb.from('neighborhood_fees').delete().eq('id',row.id);
      if(res.error)throw res.error;
      delete config.bairroFees[String(row.name).trim().toLowerCase()];
      await bvReloadFeesUI();
      if(typeof refreshNeighborhoodFee==='function')refreshNeighborhoodFee();
      toast('Bairro excluído com sucesso.');
    }catch(e){console.error('BV excluir taxa:',e);toast('Não foi possível excluir: '+(e.message||'verifique a permissão de administrador'))}
  };

  window.refreshDeliveryFeeForNeighborhood=async function(name){
    const wanted=bvNormFeeName(name);
    if(!wanted)return null;
    try{
      const {data,error}=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true).limit(500);
      if(error)throw error;
      const row=(data||[]).find(x=>bvNormFeeName(x.name)===wanted);
      return row?Number(row.fee)||0:Number(config.fee)||0;
    }catch(e){console.warn('BV consulta taxa:',e);return Number(config.fee)||0}
  };

  window.refreshDeliveryFees=async function(){return bvReloadFeesUI()};

  window.finish=async function(){
    try{
      if(!Array.isArray(cart)||!cart.length)return toast('Adicione um produto.');
      const u=await user();
      if(!u)return toast('Faça login para finalizar o pedido.');
      const delivery=$('address')?.style.display!=='none';
      const payment=localStorage.bv_payment||'Pix';
      if(delivery&&(!$('name')?.value||!$('street')?.value||!$('num')?.value||!$('bairro')?.value))return toast('Preencha nome e endereço.');
      if(!delivery&&!$('name')?.value)return toast('Informe seu nome.');

      // O Supabase é a fonte oficial do cardápio. Não fazemos uma consulta
      // separada de products aqui, evitando o erro "Não foi possível consultar o cardápio".
      // A função create_bv_order valida os produtos e calcula a taxa no servidor.
      // O carrinho pode conter IDs antigos (1, 2, 3...) salvos antes da integração.
      // Convertemos cada item para o UUID real do produto no Supabase, usando o
      // cardápio sincronizado e, como fallback, o nome do produto.
      const catalog=Array.isArray(products)?products:[];
      const items=cart.map(x=>{
        const p=catalog.find(p=>String(p.id)===String(x.id)) ||
          catalog.find(p=>String(p.name||'').trim().toLowerCase()===String(x.name||'').trim().toLowerCase());
        if(!p?.id)throw new Error('Produto não encontrado no cardápio: '+String(x.name||x.id));
        return {product_id:String(p.id),quantity:Math.max(1,Number(x.q)||1)};
      });

      const payload={
        p_customer_name:String($('name')?.value||'').trim(),
        p_phone:String($('phone')?.value||'').trim(),
        p_address:delivery
          ? String($('street')?.value||'').trim()+', '+String($('num')?.value||'').trim()+
            (String($('comp')?.value||'').trim()?' — '+String($('comp').value).trim():'')
          : '',
        p_neighborhood:delivery?String($('bairro')?.value||'').trim():'',
        p_payment_method:payment==='Pix'?'pix':payment==='Cartão'?'cartao':'dinheiro',
        p_coupon:String($('coupon')?.value||'').trim().toUpperCase(),
        p_items:items
      };

      const {data:orderId,error}=await sb.rpc('create_bv_order',payload);
      if(error||!orderId){
        console.error('BV create_bv_order:',error,payload);
        const msg=String(error?.message||error?.details||error?.hint||'').replace(/\\s+/g,' ').trim();
        return toast(msg?('Erro ao finalizar: '+msg.slice(0,150)):'Não foi possível finalizar o pedido.');
      }

      localStorage.bv_last_order=JSON.stringify({id:orderId,phone:payload.p_phone});
      if(delivery)localStorage.bv_saved_address=JSON.stringify({
        name:payload.p_customer_name,phone:payload.p_phone,
        street:$('street').value,num:$('num').value,bairro:$('bairro').value,
        cep:$('cep').value,comp:$('comp').value
      });

      cart=[];localStorage.bv_cart='[]';
      await ordersDB();
      if($('trackId'))$('trackId').value=orderId;
      if($('trackPhone'))$('trackPhone').value=payload.p_phone;
      showPage('acompanhar');
      renderTracking(orders.find(x=>String(x.id)===String(orderId)));
      toast('Pedido finalizado com sucesso!');
    }catch(e){
      console.error('BV finalização geral:',e);
      toast('Não foi possível finalizar: '+String(e.message||'erro no servidor').slice(0,150));
    }
  };
  window.change=window.change||change;
  setTimeout(()=>{try{bvReloadFeesUI()}catch(e){}},500);

  window.login=login;window.registerUser=register;window.createUser=createUserDB;window.addProduct=addProductDB;window.removeProduct=deleteProductDB;window.saveCfg=saveCfgDB;/* As funções de bairros/taxas da camada de recuperação ficam ativas. Não sobrescrever com as rotinas antigas. */window.statusOrder=statusDB;window.deleteOrder=deleteOrderDB;window.confirmPix=pixDB;window.assignMotoboy=assignMotoboyDB;window.markDeliveryFee=markDeliveryFeeDB;window.finishMotoDelivery=finishMotoDeliveryDB;window.renderUsers=usersDB;window.syncAllData=syncAllData;
  const oldLogout=window.logout;
  window.logout=async()=>{stopRealtime();try{await sb.auth.signOut()}catch(e){}if(oldLogout)oldLogout()};

  sb.auth.getSession().then(async({data})=>{
    if(!data.session)return;
    const p=await profile();session(data.session.user,p);
    await Promise.all([productsDB(),feesDB(),ordersDB()]);
    if(p?.role==='administrador')await syncLocalBairros();await feesDB();
    startRealtime();$('login').style.display='none';applyAccess();showPage(p?.role==='administrador'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
  });

  sb.auth.onAuthStateChange(async(ev,s)=>{
    if(ev==='SIGNED_OUT'||!s||syncing)return;
    syncing=true;
    try{
      const p=await profile();
      session(s.user,p);
      await Promise.all([productsDB(),feesDB(),ordersDB()]);
      startRealtime();
      if(typeof applyAccess==='function')applyAccess();
      if(typeof showPage==='function')showPage(p?.role==='administrador'||p?.role==='admin'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
    }finally{syncing=false}
  });
})();
