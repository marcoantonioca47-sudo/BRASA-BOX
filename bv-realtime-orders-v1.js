/* BRASABOX — atualização instantânea de status dos pedidos
   Supabase Realtime + fallback de segurança a cada 10 segundos. Não substitui as rotinas existentes:
   apenas força a atualização das telas quando a tabela orders muda.
*/
(() => {
  'use strict';

  let channel = null;
  let fallbackTimer = null;
  let lastRefresh = 0;
  let refreshPending = false;
  let motoTimer = null;
  let generalTimer = null;

  const sb = () => window.BV_SUPABASE;

  function isMotoPedidos(){
    return String(window.BV_ROLE||'').toLowerCase()==='motoboy' && document.getElementById('page-pedidos')?.classList.contains('activePage');
  }

  function refreshMoto(){
    clearTimeout(motoTimer);
    motoTimer=setTimeout(()=>{
      if (isMotoPedidos()) window.renderMotoOrders?.({silent:true});
    },1500);
  }

  function queueGeneralRefresh(reason) {
    if (isMotoPedidos()) return;
    clearTimeout(generalTimer);
    generalTimer=setTimeout(()=>refreshNow(reason),1400);
  }

  async function refreshNow(reason) {
    if (isMotoPedidos()) { return; }
    const fn = window.BV_REFRESH_ORDERS;
    if (typeof fn !== 'function') return;
    const now = Date.now();
    if (now - lastRefresh < 2500) return;
    if (refreshPending) return;

    refreshPending = true;
    lastRefresh = now;
    try {
      await fn();
      if (document.getElementById('page-dashboard')?.classList.contains('activePage')) window.renderMotoOrders?.({silent:true});
      // Só atualiza a tela de taxas se ela estiver aberta, e sem apagar o conteúdo atual.
      if (document.getElementById('page-taxa-entrega')?.classList.contains('activePage')) {
        window.renderMotoFeeOrders?.({silent:true});
      }
      if (document.getElementById('page-dashboard')?.classList.contains('activePage')) window.renderDashboard?.();
      // BV_REFRESH_ORDERS já atualiza a tela de acompanhamento somente quando
      // o conteúdo mudou. Não redesenhar aqui para evitar oscilação.
    } catch (e) {
      console.warn('[BV REALTIME] atualização:', reason, e);
    } finally {
      refreshPending = false;
    }
  }

  function startRealtime() {
    const client = sb();
    if (!client || channel) return;

    channel = client
      .channel('bv-orders-status-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          console.log('[BV REALTIME] pedido atualizado:', payload.eventType, payload.new?.id || payload.old?.id);
          queueGeneralRefresh('realtime');
        }
      )
      .subscribe(status => {
        console.log('[BV REALTIME] canal:', status);
      });

    // Reserva de segurança caso o Realtime fique indisponível no navegador.
    clearInterval(fallbackTimer);
    fallbackTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (isMotoPedidos()) return; // o módulo dedicado do motoboy controla sua própria atualização
      refreshNow('fallback');
    }, 30000);
  }

  function boot() {
    if (window.BV_SUPABASE) {
      startRealtime();
      return;
    }
    setTimeout(boot, 500);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isMotoPedidos() && Date.now() - lastRefresh > 3000) refreshNow('visibility');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.BV_REALTIME_VERSION = '2026.09.26.800';
})();
