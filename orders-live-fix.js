/* BRASABOX — correção de sincronização da aba PEDIDOS
   Garante que pedidos gravados no Supabase apareçam no painel administrativo
   imediatamente, sem depender do cache local. */
(function(){
  const sb=window.BV_SUPABASE;
  if(!sb)return;

  const statusMap={
    recebido:'Novo',
    em_preparo:'Em preparo',
    em_producao:'Em produção',
    pronto:'Pronto',
    saiu_entrega:'Saiu para entrega',
    entregue:'Entregue',
    cancelado:'Cancelado'
  };

  function money(v){return Number(v)||0}

  async function loadOrdersNow(){
    try{
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return false;

      const {data:me}=await sb.from('profiles').select('id,name,role').eq('id',user.id).maybeSingle();
      if(!me)return false;

      const isAdmin=['administrador','admin'].includes(me.role);
      const isMoto=me.role==='motoboy';

      let q=sb.from('orders')
        .select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,delivery_fee_collected,total,payment_method,payment_status,status,created_at,motoboy_id')
        .order('created_at',{ascending:false});

      if(!isAdmin && isMoto){
        q=q.eq('motoboy_id',user.id).eq('status','em_producao');
      }else if(!isAdmin){
        q=q.eq('user_id',user.id);
      }

      const {data,error}=await q;
      if(error){
        console.error('BV pedidos — consulta:',error);
        return false;
      }

      const rows=Array.isArray(data)?data:[];
      const ids=rows.map(o=>o.id).filter(Boolean);
      let items=[];

      if(ids.length){
        const ir=await sb.from('order_items')
          .select('order_id,product_name,quantity,unit_price,total')
          .in('order_id',ids);
        if(!ir.error)items=Array.isArray(ir.data)?ir.data:[];
        else console.warn('BV itens do pedido:',ir.error.message);
      }

      const grouped={};
      items.forEach(i=>{
        (grouped[i.order_id]||(grouped[i.order_id]=[])).push(i);
      });

      const mapped=rows.map(o=>{
        const oi=grouped[o.id]||[];
        const address=o.address?{
          rua:String(o.address||''),
          numero:'',
          bairro:String(o.neighborhood||''),
          cep:'',
          complemento:''
        }:null;

        return {
          id:o.id,
          orderNumber:o.order_number,
          created_at:o.created_at,
          customer:o.customer_name,
          phone:o.phone,
          motoboy_id:o.motoboy_id||null,
          deliveryFee:money(o.delivery_fee),
          deliveryFeeCollected:!!o.delivery_fee_collected,
          items:oi.map(i=>`${i.quantity}x ${i.product_name}`).join(', ') || 'Itens do pedido',
          total:money(o.total),
          payment:o.payment_method==='pix'?'Pix':o.payment_method==='cartao'?'Cartão':'Dinheiro',
          delivery:o.address?'Entrega':'Retirada',
          address,
          status:statusMap[o.status]||o.status||'Novo',
          paid:o.payment_status==='pago',
          time:o.created_at?new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''
        };
      });

      orders.splice(0,orders.length,...mapped);
      localStorage.setItem('bv_orders',JSON.stringify(mapped));

      if(typeof renderAdmin==='function' && (isAdmin||isMoto))renderAdmin();
      if(typeof renderTracking==='function')renderTracking();

      return true;
    }catch(e){
      console.error('BV pedidos — sincronização:',e);
      return false;
    }
  }

  window.BV_REFRESH_ORDERS=loadOrdersNow;

  // Atualiza imediatamente quando a aba PEDIDOS é aberta.
  const oldShowPage=window.showPage;
  window.showPage=function(page){
    const result=oldShowPage?oldShowPage.apply(this,arguments):false;
    if(page==='pedidos' || page==='dashboard'){
      setTimeout(loadOrdersNow,80);
    }
    return result;
  };

  // Atualização rápida para o painel administrativo.
  let timer=null;
  function start(){
    if(timer)clearInterval(timer);
    timer=setInterval(loadOrdersNow,4000);
    setTimeout(loadOrdersNow,250);
  }

  sb.auth.getSession().then(({data})=>{
    if(data?.session)start();
  });

  sb.auth.onAuthStateChange((event,session)=>{
    if(session && event!=='SIGNED_OUT')start();
    if(event==='SIGNED_OUT' && timer){clearInterval(timer);timer=null;}
  });
})();
