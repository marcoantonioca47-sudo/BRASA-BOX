/* BRASABOX — correção final das telas do motoboy v2
   - Motoboy acessa somente Pedidos e Taxa de entrega.
   - Pedidos disponíveis: Em preparo / Em produção sem motoboy ou atribuídos ao logado.
   - Pedido coletado permanece em Saiu para entrega até Confirmar entrega.
   - Não deixa falha em order_items impedir a tela inteira.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const role = () => String(window.BV_ROLE || '').trim().toLowerCase();
  const isMoto = () => role() === 'motoboy';
  const sb = () => window.BV_SUPABASE;

  window.BV_MOTO_SCREEN_FIX_VERSION = '2026.09.25.2';

  const oldShowPage = window.showPage;
  window.showPage = function(page, internal) {
    if (isMoto()) {
      if (page !== 'pedidos' && page !== 'taxa-entrega') page = 'pedidos';
    }
    return typeof oldShowPage === 'function'
      ? oldShowPage.call(this, page, internal)
      : undefined;
  };

  const oldApplyAccess = window.applyAccess;
  window.applyAccess = function() {
    if (typeof oldApplyAccess === 'function') oldApplyAccess();
    if (!isMoto()) return;

    document.querySelectorAll('.sideNav [data-page]').forEach(btn => {
      const allowed = btn.dataset.page === 'pedidos' || btn.dataset.page === 'taxa-entrega';
      btn.style.setProperty('display', allowed ? '' : 'none', 'important');
    });
    document.querySelectorAll('.sideNav .navTitle, .sideBottom .adminOnly, .cartTop, #bvCartFloat').forEach(el => {
      el.style.setProperty('display','none','important');
    });
  };

  function setOrdersLoading() {
    const box = $('orders');
    if (box) box.innerHTML = '<div class="emptyState"><span>⏳</span><b>Carregando entregas...</b><small>Buscando pedidos disponíveis e pedidos em rota.</small></div>';
  }

  function renderOrder(o, items) {
    const ready = ['em_preparo','em_producao'].includes(String(o.status));
    const statusText = ready ? (o.status === 'em_producao' ? 'Em produção' : 'Em preparo') : 'Saiu para entrega';
    const action = ready
      ? '<button class="motoFinishBtn motoCollectBtn" type="button" onclick="motoAction(\''+esc(o.id)+'\',\'coletar\')">📦 Coletar pedido</button>'
      : '<button class="motoFinishBtn motoDeliverBtn" type="button" onclick="motoAction(\''+esc(o.id)+'\',\'entregar\')">✅ Confirmar entrega</button>';
    const list = items.length ? items.map(i => esc(i.quantity)+'x '+esc(i.product_name)).join(', ') : 'Itens do pedido';
    const address = o.address
      ? esc(o.address) + (o.neighborhood ? ' · '+esc(o.neighborhood) : '')
      : 'Endereço não informado';

    return '<article class="orderCard motoOrder">'+
      '<div class="orderHead"><div><small>PEDIDO</small><b>#'+esc(String(o.order_number || o.id).padStart(3,'0'))+'</b></div><span class="statusBadge">'+esc(statusText)+'</span></div>'+
      '<div class="orderBody"><b>'+esc(o.customer_name || 'Cliente')+'</b><p>'+list+'</p>'+
      '<div class="motoContactInfo"><div class="motoContactItem"><span>📍 Endereço</span><strong>'+address+'</strong></div>'+
      '<div class="motoContactItem"><span>📱 Celular</span><strong>'+esc(o.phone || 'Não informado')+'</strong></div></div></div>'+
      '<div class="motoFeeCard"><span>Taxa de entrega</span><strong>'+money(o.delivery_fee)+'</strong></div>'+
      action+
    '</article>';
  }

  window.renderMotoOrders = async function() {
    if (!isMoto()) return;
    const box = $('orders');
    const filters = $('adminOrderFilters');
    const panel = $('motoDeliveryPanel');
    if (filters) filters.style.display = 'none';
    if (panel) panel.style.display = 'none';
    if (!box) return;

    const client = sb();
    if (!client) {
      box.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Banco indisponível</b><small>Recarregue a página.</small></div>';
      return;
    }

    setOrdersLoading();

    try {
      const {data:{user},error:userError} = await client.auth.getUser();
      if (userError || !user) throw new Error('Sessão do motoboy não encontrada.');

      const fields = 'id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';

      const [preparo, producao, rota] = await Promise.all([
        client.from('orders').select(fields)
          .eq('status','em_preparo')
          .or('motoboy_id.is.null,motoboy_id.eq.'+user.id)
          .order('created_at',{ascending:false}),
        client.from('orders').select(fields)
          .eq('status','em_producao')
          .or('motoboy_id.is.null,motoboy_id.eq.'+user.id)
          .order('created_at',{ascending:false}),
        client.from('orders').select(fields)
          .eq('status','saiu_entrega')
          .eq('motoboy_id',user.id)
          .order('created_at',{ascending:false})
      ]);

      const firstError = preparo.error || producao.error || rota.error;
      if (firstError) throw firstError;

      const rows = [];
      const seen = new Set();
      [...(preparo.data||[]), ...(producao.data||[]), ...(rota.data||[])].forEach(o => {
        if (!seen.has(String(o.id))) {
          seen.add(String(o.id));
          rows.push(o);
        }
      });
      rows.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

      const itemsByOrder = {};
      if (rows.length) {
        const ir = await client.from('order_items')
          .select('order_id,product_name,quantity')
          .in('order_id',rows.map(o=>o.id));
        if (!ir.error) (ir.data||[]).forEach(i => (itemsByOrder[i.order_id] ||= []).push(i));
      }

      if (!rows.length) {
        box.innerHTML = '<div class="emptyState"><span>🏍️</span><b>Nenhuma entrega no momento</b><small>Pedidos em preparo ou produção aparecerão aqui para coleta. Depois de coletado, o pedido permanece aqui até a confirmação da entrega.</small></div>';
        return;
      }

      box.innerHTML = rows.map(o => renderOrder(o,itemsByOrder[o.id]||[])).join('');
    } catch (e) {
      console.error('[BV MOTO SCREEN FIX]',e);
      box.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar os pedidos</b><small>'+esc(e?.message || 'Erro ao consultar os pedidos.')+'</small><button type="button" onclick="renderMotoOrders()">Tentar novamente</button></div>';
    }
  };

  window.motoAction = async function(id, action) {
    if (!isMoto()) return;
    if (!['coletar','entregar'].includes(action)) return;

    const client = sb();
    if (!client) return;
    document.querySelectorAll('.motoFinishBtn').forEach(b => b.disabled = true);

    try {
      const {data,error} = await client.rpc('motoboy_collect_or_deliver',{
        p_order_id:id,
        p_action:action
      });
      if (error) throw error;

      await window.renderMotoOrders();
      if (action === 'entregar') await window.renderMotoFeeOrders?.();

      window.toast?.(
        action === 'coletar'
          ? 'Pedido coletado. Status: Saiu para entrega.'
          : 'Entrega confirmada. Pedido marcado como Entregue.'
      );
      return data;
    } catch (e) {
      console.error('[BV MOTO ACTION]',e);
      window.toast?.('Não foi possível atualizar o pedido: '+String(e?.message || 'erro').slice(0,180));
      await window.renderMotoOrders();
    } finally {
      document.querySelectorAll('.motoFinishBtn').forEach(b => b.disabled = false);
    }
  };

  window.motoFinish = id => window.motoAction(id,'entregar');

  const oldFee = window.renderMotoFeeOrders;
  window.renderMotoFeeOrders = async function() {
    if (!isMoto()) return typeof oldFee === 'function' ? oldFee() : undefined;
    const b = $('motoFeeOrders');
    const client = sb();
    if (!b || !client) return;

    b.innerHTML = '<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';

    try {
      const {data:{user},error:userError} = await client.auth.getUser();
      if (userError || !user) throw new Error('Sessão do motoboy não encontrada.');

      const r = await client.from('orders')
        .select('id,order_number,delivery_fee,created_at,motoboy_id')
        .eq('status','entregue')
        .eq('motoboy_id',user.id)
        .order('created_at',{ascending:false});

      if (r.error) throw r.error;

      const rows = r.data || [];
      const total = rows.reduce((sum,o)=>sum + Number(o.delivery_fee || 0),0);
      const date = v => {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? 'Data não disponível' : d.toLocaleDateString('pt-BR');
      };

      if ($('deliveryFeeEyebrow')) $('deliveryFeeEyebrow').textContent = 'MOTOBOY';
      if ($('deliveryFeeDescription')) $('deliveryFeeDescription').textContent = 'Consulte suas taxas das entregas realizadas.';

      b.innerHTML =
        '<div class="motoFeeFilter">'+
          '<div class="motoFeeQuickFilters">'+
            '<button type="button" class="active">Todas</button>'+
          '</div>'+
        '</div>'+
        '<div class="motoFeeSummary"><div><small>Total de taxas</small><strong>'+money(total)+'</strong></div><div><small>Entregas</small><strong>'+rows.length+'</strong></div></div>'+
        (rows.length
          ? rows.map(o => '<div class="motoFeeRow"><div><b>#'+esc(String(o.order_number||o.id).padStart(3,'0'))+'</b><small>'+date(o.created_at)+'</small></div><strong>'+money(o.delivery_fee)+'</strong></div>').join('')
          : '<div class="emptyState"><span>💰</span><b>Nenhuma taxa registrada</b><small>As taxas aparecem aqui após as entregas serem confirmadas.</small></div>');
    } catch(e) {
      console.error('[BV MOTO FEES]',e);
      b.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message || 'Erro ao consultar taxas.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>';
    }
  };

  function enforce() {
    if (!isMoto()) return;
    window.applyAccess?.();
    const active = document.querySelector('.page.activePage')?.id || '';
    if (!['page-pedidos','page-taxa-entrega'].includes(active)) window.showPage('pedidos',true);
  }

  const css = document.createElement('style');
  css.textContent =
    '.motoFinishBtn{min-height:46px!important;width:100%!important;font-weight:900!important}'+
    '.motoCollectBtn{background:linear-gradient(135deg,#e50914,#9d0007)!important}'+
    '.motoDeliverBtn{background:linear-gradient(135deg,#20a65a,#08783b)!important}'+
    '.motoFinishBtn:disabled{opacity:.55!important;cursor:wait!important}';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(enforce,120);
    setTimeout(() => { if (isMoto()) window.showPage('pedidos',true); },350);
  });

  const originalLoadApp = window.loadApp;
  if (typeof originalLoadApp === 'function' && !window.BV_MOTO_LOAD_PATCHED) {
    window.loadApp = async function() {
      const r = await originalLoadApp.apply(this,arguments);
      setTimeout(enforce,80);
      return r;
    };
    window.BV_MOTO_LOAD_PATCHED = true;
  }
})();
