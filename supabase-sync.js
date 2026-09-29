/* BRASABOX - sincronização Supabase */
(function(){
const cfg=window.BV_SUPABASE_CONFIG;if(!cfg||!cfg.url||!cfg.publishableKey)return;
function load(){if(window.supabase){window.BV_DB=window.supabase.createClient(cfg.url,cfg.publishableKey);init();return}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=function(){window.BV_DB=window.supabase.createClient(cfg.url,cfg.publishableKey);init()};document.head.appendChild(s)}
async function applySession(session){const id=session.user.id;let {data:p}=await window.BV_DB.from('profiles').select('id,name,role').eq('id',id).maybeSingle();if(!p){await window.BV_DB.from('profiles').insert({id,name:session.user.user_metadata?.name||'',role:'usuario'});p={id,name:session.user.user_metadata?.name||'',role:'usuario'}}sessionStorage.setItem('bv_user_id',id);sessionStorage.setItem('bv_role',p.role||'usuario');sessionStorage.setItem('bv',p.role==='administrador'?'1':'0');if(typeof applyAccess==='function')applyAccess()}
async function init(){try{const {data:{session}}=await BV_DB.auth.getSession();if(session)await applySession(session);BV_DB.auth.onAuthStateChange(async function(_e,s){if(s)await applySession(s);else{sessionStorage.clear();if($('login'))$('login').style.display='flex'}})}catch(e){console.error('Supabase Auth:',e)}window.BV_DB_READY=true;window.dispatchEvent(new Event('bv-supabase-ready'));setTimeout(patchApp,0)}
window.BV_registerSupabase=async(n,e,p)=>{const {data,error}=await BV_DB.auth.signUp({email:e,password:p,options:{data:{name:n}}});if(error)throw error;return data};
window.BV_loginSupabase=async(e,p)=>{const {data,error}=await BV_DB.auth.signInWithPassword({email:e,password:p});if(error)throw error;return data};
window.BV_logoutSupabase=async()=>{if(BV_DB)await BV_DB.auth.signOut()};
window.BV_loadProducts=async()=>{const {data,error}=await BV_DB.from('products').select('*').order('created_at',{ascending:true});if(error)throw error;return(data||[]).map(p=>({id:p.id,name:p.name,price:Number(p.price),desc:p.description,category:p.category,emoji:'🍔',active:p.active}))};
window.BV_saveProduct=async p=>{const row={name:p.name,description:p.desc||p.description||'',price:Number(p.price)||0,category:p.category||'Lanches',active:p.active!==false};const q=p.id?BV_DB.from('products').update(row).eq('id',p.id):BV_DB.from('products').insert(row);const {data,error}=await q.select().single();if(error)throw error;return data};
window.BV_deleteProduct=async id=>{const {error}=await BV_DB.from('products').delete().eq('id',id);if(error)throw error};
window.BV_loadFees=async()=>{const {data,error}=await BV_DB.from('neighborhood_fees').select('*').eq('active',true).order('name');if(error)throw error;return data||[]};
window.BV_saveFee=async(name,fee)=>{const {data,error}=await BV_DB.from('neighborhood_fees').upsert({name,fee:Number(fee)||0,active:true},{onConflict:'name'}).select().single();if(error)throw error;return data};
window.BV_deleteFee=async id=>{const {error}=await BV_DB.from('neighborhood_fees').delete().eq('id',id);if(error)throw error};
window.BV_loadUsers=async()=>{const {data,error}=await BV_DB.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:false});if(error)throw error;return data||[]};
window.BV_setRole=async(id,role)=>{const {data,error}=await BV_DB.from('profiles').update({role}).eq('id',id).select().single();if(error)throw error;return data};
window.BV_createOrder=async o=>{const uid=sessionStorage.getItem('bv_user_id');if(!uid)throw new Error('Faça login para criar o pedido.');const {data,error}=await BV_DB.from('orders').insert({user_id:uid,customer_name:o.customer,phone:o.phone||'',address:o.address?`${o.address.rua}, ${o.address.numero}`:'',neighborhood:o.address?.bairro||'',delivery_fee:o.deliveryFee||0,subtotal:o.subtotal||o.total||0,total:o.total||0,payment_method:(o.payment||'Pix').toLowerCase()==='pix'?'pix':(o.payment||'').toLowerCase()==='dinheiro'?'dinheiro':'cartao',payment_status:o.paid?'pago':'pendente',status:'recebido',notes:o.items||''}).select().single();if(error)throw error;return data};
window.BV_loadOrders=async()=>{const {data,error}=await BV_DB.from('orders').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]};
window.BV_updateOrder=async(id,status,paymentStatus)=>{const patch={};if(status)patch.status=status;if(paymentStatus)patch.payment_status=paymentStatus;const {data,error}=await BV_DB.from('orders').update(patch).eq('id',id).select().single();if(error)throw error;return data};
async function patchApp(){if(!window.BV_DB_READY)return;const oldFinish=window.finish,oldStatus=window.statusOrder,oldRenderAdmin=window.renderAdmin;
window.login=async function(){
  const e=$('email')?.value.trim().toLowerCase()||'',p=$('pass')?.value||'';
  if(!e||!p){if($('err'))$('err').textContent='Digite o e-mail e a senha.';return}
  let list=[];
  try{list=safeParse('bv_users',[]);if(!Array.isArray(list))list=[]}catch(_){list=[]}
  const defaults=[
    {id:'admin-marco',name:'Administrador',email:'marco@bv.com',pass:'123456',role:'administrador'},
    {id:'user-demo',name:'Usuário',email:'usuario@bv.com',pass:'123456',role:'usuario'}
  ];
  defaults.forEach(d=>{
    const i=list.findIndex(x=>String(x.email||'').trim().toLowerCase()===d.email);
    if(i<0)list.push({...d});
    else{list[i].id=list[i].id||d.id;list[i].name=list[i].name||d.name;list[i].pass=d.pass;list[i].role=list[i].role||d.role}
  });
  localStorage.bv_users=JSON.stringify(list);
  const local=list.find(x=>String(x.email||'').trim().toLowerCase()===e&&String(x.pass??'')===p);
  if(local){
    sessionStorage.setItem('bv_user_id',local.id);
    sessionStorage.setItem('bv_role',local.role||'usuario');
    sessionStorage.setItem('bv',local.role==='administrador'?'1':'0');
    if($('login'))$('login').style.display='none';
    if($('err'))$('err').textContent='';
    applyAccess();showPage(local.role==='administrador'?'dashboard':local.role==='motoboy'?'pedidos':'inicio');
    toast('Login realizado com sucesso!');
    return;
  }
  try{
    await BV_loginSupabase(e,p);
    if($('login'))$('login').style.display='none';
    if($('err'))$('err').textContent='';
    const r=sessionStorage.getItem('bv_role');applyAccess();showPage(r==='administrador'?'dashboard':r==='motoboy'?'pedidos':'inicio');toast('Login realizado');
  }catch(err){if($('err'))$('err').textContent='E-mail ou senha incorretos.'}
};
window.registerUser=async function(e){if(e)e.preventDefault();const n=$('registerName')?.value.trim()||'',em=$('registerEmail')?.value.trim().toLowerCase()||'',p=$('registerPass')?.value||'',p2=$('registerPass2')?.value||'',er=$('registerErr');if(!n||!em||!p||!p2){if(er)er.textContent='Preencha todos os campos.';return}if(p.length<6){if(er)er.textContent='A senha deve ter pelo menos 6 caracteres.';return}if(p!==p2){if(er)er.textContent='As senhas não coincidem.';return}try{await BV_registerSupabase(n,em,p);$('email').value=em;$('pass').value='';closeRegister();toast('Conta criada com sucesso! Agora faça login.')}catch(err){if(er)er.textContent=err.message||'Não foi possível criar a conta.'}};
window.logout=async function(){await BV_logoutSupabase();sessionStorage.clear();if($('login'))$('login').style.display='flex';if($('email'))$('email').value='';if($('pass'))$('pass').value='';applyAccess();showPage('inicio');toast('Conta desconectada')};
window.finish=async function(){if(!oldFinish)return;try{await oldFinish();const o=safeParse('bv_orders',[])[0];if(o&&sessionStorage.getItem('bv_user_id')){await BV_createOrder(o);const dbOrders=await BV_loadOrders();localStorage.bv_orders=JSON.stringify(dbOrders.map(x=>({id:String(x.id).slice(-5),customer:x.customer_name,phone:x.phone,items:x.notes,total:Number(x.total),payment:x.payment_method==='pix'?'Pix':x.payment_method==='dinheiro'?'Dinheiro':'Cartão',status:x.payment_status==='pendente'&&x.payment_method==='pix'?'Aguardando pagamento':x.status==='entregue'?'Entregue':x.status==='em_preparo'?'Em preparo':x.status==='saiu_entrega'?'Saiu para entrega':'Confirmado',paid:x.payment_status==='pago',time:new Date(x.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})})));if(typeof renderAdmin==='function')renderAdmin()}}catch(err){console.error(err);toast('Pedido criado localmente, mas não foi sincronizado.')}};
window.statusOrder=async function(id,s){try{if(oldStatus)oldStatus(id,s);const map={'Novo':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};const payment=s==='Confirmado'?'pago':undefined;const local=safeParse('bv_orders',[]).find(o=>String(o.id)===String(id));if(local&&local.supabaseId)await BV_updateOrder(local.supabaseId,map[s]||'recebido',payment)}catch(e){console.error('Status Supabase:',e)}};
try{const ps=await BV_loadProducts();if(ps.length){window.products=ps;localStorage.bv_products=JSON.stringify(ps);if(typeof renderProducts==='function')renderProducts()}}catch(e){console.warn('Produtos Supabase:',e)}
try{const fs=await BV_loadFees();window.config=window.config||{};window.config.bairroFees={};fs.forEach(f=>window.config.bairroFees[String(f.name).toLowerCase()]=Number(f.fee));localStorage.bv_config=JSON.stringify(window.config)}catch(e){console.warn('Taxas Supabase:',e)}
try{const us=await BV_loadUsers();if(us.length){const old=safeParse('bv_users',[]);localStorage.bv_users=JSON.stringify(us.map(u=>({id:u.id,name:u.name,email:(old.find(x=>x.id===u.id)||{}).email||'',role:u.role,pass:''})));if(typeof renderUsers==='function')renderUsers()}}catch(e){console.warn('Usuários Supabase:',e)}
try{const os=await BV_loadOrders();if(os.length){localStorage.bv_orders=JSON.stringify(os.map(x=>({id:String(x.id).slice(-5),supabaseId:x.id,customer:x.customer_name,phone:x.phone,items:x.notes,total:Number(x.total),payment:x.payment_method==='pix'?'Pix':x.payment_method==='dinheiro'?'Dinheiro':'Cartão',status:x.payment_status==='pendente'&&x.payment_method==='pix'?'Aguardando pagamento':x.status==='entregue'?'Entregue':x.status==='em_preparo'?'Em preparo':x.status==='saiu_entrega'?'Saiu para entrega':'Confirmado',paid:x.payment_status==='pago',time:new Date(x.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),address:x.neighborhood?{bairro:x.neighborhood,rua:x.address,numero:''}:null})));if(typeof renderAdmin==='function')renderAdmin()}}catch(e){console.warn('Pedidos Supabase:',e)}
}
load();
})();
