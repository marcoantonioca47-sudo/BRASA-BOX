/* BRASABOX — proteção do painel administrativo e usuários v1 */
(function(){
  'use strict';

  const ADMIN_ROLES = ['administrador','admin'];
  const ADMIN_PAGES = new Set(['dashboard','pedidos','produtos','promocoes','cupons','config','taxa-entrega']);

  function isAdmin(){
    return ADMIN_ROLES.includes(String(window.BV_ROLE||'').trim().toLowerCase());
  }

  function $(id){ return document.getElementById(id); }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function showAccessMessage(){
    const box=$('userPermissions');
    if(!box)return;
    box.innerHTML='<div class="userError" style="padding:22px;text-align:center;border-radius:12px;background:#111419;color:#aeb4bd"><b style="display:block;color:#fff;margin-bottom:7px">Acesso administrativo necessário</b><span>Esta conta não possui permissão de administrador. Entre com a conta administrativa para gerenciar usuários e contas.</span></div>';
    if($('userCount'))$('userCount').textContent='Acesso restrito';
  }

  function install(){
    if(window.__BV_ADMIN_USERS_GUARD_INSTALLED)return;
    if(typeof window.showPage!=='function')return;
    window.__BV_ADMIN_USERS_GUARD_INSTALLED=true;

    const originalShowPage=window.showPage;
    window.showPage=function(page){
      const p=String(page||'');
      if(ADMIN_PAGES.has(p) && !isAdmin()){
        window.toast?.('Acesso restrito ao administrador.');
        return originalShowPage.call(this,'inicio',true);
      }
      return originalShowPage.apply(this,arguments);
    };

    const originalOpenAdmin=window.openAdmin;
    window.openAdmin=function(page){
      if(!isAdmin()){
        window.toast?.('Acesso restrito ao administrador.');
        return originalShowPage.call(this,'inicio',true);
      }
      if(typeof originalOpenAdmin==='function')return originalOpenAdmin.apply(this,arguments);
      return originalShowPage.call(this,page);
    };

    const originalRenderUsers=window.renderUsers;
    window.renderUsers=async function(){
      if(!isAdmin()){
        showAccessMessage();
        return;
      }
      if(typeof originalRenderUsers!=='function'){
        showAccessMessage();
        return;
      }
      try{
        return await originalRenderUsers.apply(this,arguments);
      }catch(e){
        console.error('[BV ADMIN USERS]',e);
        const box=$('userPermissions');
        if(box)box.innerHTML='<div class="userError">Não foi possível carregar os usuários agora. Tente novamente.</div>';
      }
    };

    // Se o navegador restaurar uma sessão não administrativa, não deixa
    // uma página administrativa antiga permanecer aberta.
    if(!isAdmin() && document.querySelector('.adminPage.activePage')){
      originalShowPage.call(this,'inicio',true);
    }

    // Mostra uma mensagem correta quando uma chamada antiga de usersDB recebe 403.
    const originalConsoleWarn=console.warn;
    console.warn=function(){
      try{
        const msg=Array.from(arguments).map(x=>String(x?.message||x||'')).join(' ');
        if(/Lista de usuários|Usuários do Supabase indisponíveis/i.test(msg) && !isAdmin())showAccessMessage();
      }catch(_){}
      return originalConsoleWarn.apply(this,arguments);
    };

    // Atualiza o painel quando o papel muda após login.
    window.addEventListener('bv:role-changed',()=>{
      if(isAdmin() && document.getElementById('page-config')?.classList.contains('activePage')){
        window.renderUsers?.();
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  setTimeout(install,250);
  setTimeout(install,1000);
})();
