/* BRASABOX — preserva a página atual após reload
   Guarda a tela ativa e restaura depois do carregamento.
*/
(() => {
  'use strict';

  const KEY = 'bv_current_page';

  function getCurrentPage() {
    const active = document.querySelector('.page.activePage');
    if (active?.id?.startsWith('page-')) return active.id.slice(5);
    return null;
  }

  function remember() {
    const page = getCurrentPage();
    if (!page || page === 'login') return;
    try { sessionStorage.setItem(KEY, page); } catch (e) {}
  }

  function restore() {
    let page = null;
    try { page = sessionStorage.getItem(KEY); } catch (e) {}
    if (!page || typeof window.showPage !== 'function') return;

    // Não interfere durante o login nem em uma navegação feita pelo usuário.
    if (document.getElementById('login')?.style.display !== 'none' &&
        !document.getElementById('login')?.classList.contains('hidden')) return;

    const target = document.getElementById('page-' + page);
    if (!target) return;

    window.showPage(page, true);
    window.BV_HAS_NAVIGATED = true;
  }

  // Captura toda navegação feita pelo próprio aplicativo.
  function hookShowPage() {
    if (window.BV_PAGE_PERSIST_HOOKED || typeof window.showPage !== 'function') return;
    const original = window.showPage;
    window.showPage = function(page, internal) {
      const result = original.apply(this, arguments);
      if (page && page !== 'login') {
        try { sessionStorage.setItem(KEY, String(page)); } catch (e) {}
      }
      return result;
    };
    window.BV_PAGE_PERSIST_HOOKED = true;
  }

  function boot() {
    hookShowPage();
    restore();
    // Alguns scripts terminam a montagem das páginas depois do DOM inicial.
    setTimeout(() => { hookShowPage(); restore(); }, 250);
    setTimeout(() => { hookShowPage(); restore(); }, 900);
  }

  window.addEventListener('beforeunload', remember);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') remember();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.BV_PAGE_PERSIST_VERSION = '2026.09.25.1';
})();
