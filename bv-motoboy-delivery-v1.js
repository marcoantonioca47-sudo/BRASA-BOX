/* BRASABOX — fluxo final do motoboy v1
   Fluxo: Em preparo -> Coletar pedido -> Saiu para entrega -> Confirmar entrega -> Entregue.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const sb = () => window.BV_SUPABASE;

  window.BV_MOTO_FLOW_VERSION = '2026.09.24.1';

  window.renderMotoOrders = async function(){
    if(String(window.BV_ROLE || '').toLowerCase() !== 'motoboy') return;
    const box = $('orders');
    const filters = $('adminOrderFilters');
    const panel = $('motoDeliveryPanel');
    if(filters) filters.style.display = 'none';
    if(panel) panel.style.display = 'none';
    if(!box) return;

    const client = sb();
    if(!client){
      box.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Banco indisponível</b><small>Recarregue a página.</small></div>';
      return;
    }

    box.innerHTML = '<div class="emptyState"><span>⏳</span><b>Carregando entregas...</b><small>Buscando pedidos disponíveis e em rota.</small></div>';

    try{
      const {data:{user},error:userError} = await client.auth.getUser();
      if(userError || !user) throw new Error('Sessão do motoboy não encontrada.');

      const fields = 'id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';
      const [ready, route] = await Promise.all([
        client.from('orders').select(fields)
          .eq('status','em_preparo')
          .or('motoboy_id.is.null,motoboy_id.eq.' + user.id)
          .order('created_at',{ascending:false}),
        client.from('orders').select(fields)
          .eq('status','saiu_entrega')
          .eq('motoboy_id',user.id)
          .order('created_at',{ascending:false})
      ]);
      if(ready.error) throw ready.error;
      if(route.error) throw route.error;

      const rows = [];
      const seen = new Set();
      [...(ready.data||[]),...(route.data||[])].forEach(o => {
        if(!seen.has(String(o.id))){ seen.add(String(o.id)); rows.push(o); }
      });
      rows.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

      const ids = rows.map(o=>o.id);
      let itemRows = [];
      if(ids.length){
        const ir = await client.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);
        if(ir.error) throw ir.error;
        itemRows = ir.data || [];
      }
      const grouped = {};
      itemRows.forEach(i => (grouped[i.order_id] ||= []).push(i));

      if(!rows.length){
        box.innerHTML = '<div class="emptyState"><span>🏍️</span><b>Nenhuma entrega no momento</b><small>Pedidos em preparo aparecerão aqui para coleta. Pedidos coletados permanecem aqui até a confirmação da entrega.</small></div>';
        return;
      }

      box.innerHTML = rows.map(o => {
        const status = o.status === 'saiu_entrega' ? 'Saiu para entrega' : 'Em preparo';
        const action = o.status === 'em_preparo'
          ? '<button class="motoFinishBtn motoCollectBtn" type="button" onclick="motoAction(\''+esc(o.id)+'\',\'coletar\')">📦 Coletar pedido</button>'
          : '<button class="motoFinishBtn motoDeliverBtn" type="button" onclick="motoAction(\''+esc(o.id)+'\',\'entregar\')">✅ Confirmar entrega</button>';
        const items = (grouped[o.id]||[]).map(i => i.quantity+'x '+i.product_name).join(', ');
        const address = o.address ? esc(o.address) + (o.neighborhood ? ' · '+esc(o.neighborhood) : '') : 'Endereço não informado';
        return '<article class="orderCard motoOrder">'+
          '<div class="orderHead"><div><small>PEDIDO</small><b>#'+esc(String(o.order_number||o.id).padStart(3,'0'))+'</b></div><span class="statusBadge">'+esc(status)+'</span></div>'+
          '<div class="orderBody"><b>'+esc(o.customer_name||'Cliente')+'</b><p>'+esc(items)+'</p>'+
          '<div class="motoContactInfo"><div class="motoContactItem"><span>📍 Endereço</span><strong>'+address+'</strong></div>'+
          '<div class="motoContactItem"><span>📱 Celular</span><strong>'+esc(o.phone||'Não informado')+'</strong></div></div></div>'+
          '<div class="motoFeeCard"><span>Taxa de entrega</span><strong>'+money(o.delivery_fee)+'</strong></div>'+
          action+
        '</article>';
      }).join('');
    }catch(e){
      console.error('[BV MOTO FLOW]',e);
      box.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as entregas</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoOrders()">Tentar novamente</button></div>';
    }
  };

  window.motoAction = async function(id, action){
    const client = sb();
    if(!client) return;
    if(action !== 'coletar' && action !== 'entregar') return;
    const buttons = document.querySelectorAll('.motoFinishBtn');
    buttons.forEach(b => b.disabled = true);
    try{
      const {data,error} = await client.rpc('motoboy_collect_or_deliver',{
        p_order_id:id,
        p_action:action
      });
      if(error) throw error;
      if(action === 'coletar'){
        await window.renderMotoOrders();
        window.toast?.('Pedido coletado. Status: Saiu para entrega.');
      }else{
        await window.renderMotoOrders();
        window.BV_REFRESH_ORDERS?.();
        window.renderDashboard?.();
        window.toast?.('Entrega confirmada. O pedido agora está como Entregue.');
      }
      return data;
    }catch(e){
      console.error('[BV MOTO FLOW] ação',action,e);
      window.toast?.('Não foi possível atualizar o pedido: '+String(e?.message||'erro').slice(0,180));
      await window.renderMotoOrders();
    }finally{
      document.querySelectorAll('.motoFinishBtn').forEach(b => b.disabled = false);
    }
  };

  window.motoFinish = id => window.motoAction(id,'entregar');

  const css = document.createElement('style');
  css.textContent = '.motoFinishBtn{min-height:46px!important;width:100%;font-weight:900!important}.motoCollectBtn{background:linear-gradient(135deg,#e50914,#9d0007)!important}.motoDeliverBtn{background:linear-gradient(135deg,#20a65a,#08783b)!important}.motoFinishBtn:disabled{opacity:.55!important;cursor:wait!important}';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded',()=>{
    if(String(window.BV_ROLE||'').toLowerCase()==='motoboy') setTimeout(()=>window.renderMotoOrders(),250);
  });
})();
