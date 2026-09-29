/* BRASABOX — compatibilidade legada desativada
   O site atual usa Supabase/Auth e os módulos bv-auth-v2.js e bv-order-v2.js.
   Este arquivo fica apenas como proteção caso uma página antiga tente carregá-lo.
   Ele NÃO cria pedidos, produtos, usuários ou configurações no localStorage.
*/
(() => {
  'use strict';

  // Não sobrescreva as rotinas atuais do sistema.
  // O checkout oficial é window.finish definido por bv-order-v2.js.
  // A autenticação oficial é window.login definida por bv-auth-v2.js.
  window.BV_LEGACY_APP_DISABLED = true;

  // Compatibilidade mínima para páginas antigas que apenas consultem estas funções.
  window.safeParse = window.safeParse || ((key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  });

  window.brl = window.brl || ((value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  );
})();
