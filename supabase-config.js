// BRASABOX — configuração do NOVO projeto Supabase
// Preencha com a URL e a publishable key do NOVO projeto.
// Não reutilize o projeto Supabase antigo.
// Nunca coloque aqui uma secret/service_role key.
window.BV_SUPABASE_CONFIG = {
  url: 'https://abfxvqrrsqrmykrdoqrp.supabase.co',
  publishableKey: 'COLE_AQUI_A_PUBLISHABLE_KEY_DO_NOVO_SUPABASE'
};
(function(){
  var p=document.createElement('script');
  p.src='supabase-profile-v3.js?v=NEW';
  p.defer=true;
  document.head.appendChild(p);
})();
