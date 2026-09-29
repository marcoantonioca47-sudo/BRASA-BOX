/* BRASABOX — PWA: atualização automática imediata enquanto o app está aberto */
(function(){
  let deferredPrompt=null;
  let hadController=!!navigator.serviceWorker?.controller;
  let reloading=false;
  let updateTimer=null;
  let waitingWorker=null;
  function updateButton(){return document.getElementById('bvUpdateAppBtn')}
  function showUpdate(){const b=updateButton();if(b){b.style.display='inline-flex';b.disabled=false}}
  function hideUpdate(){const b=updateButton();if(b)b.style.display='none'}
  function activateUpdate(){if(waitingWorker){waitingWorker.postMessage({type:'SKIP_WAITING'});return} location.reload()}

  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function button(){return document.getElementById('bvInstallAppBtn')}
  function show(){const b=button();if(b&&!isStandalone())b.style.display='inline-flex'}

  function applySafeArea(){
    if(!isStandalone())return;
    const id='bv-pwa-safe-area-v1';
    if(document.getElementById(id))return;
    const s=document.createElement('style');s.id=id;s.textContent=
      ':root{--bv-safe-top:env(safe-area-inset-top,0px);--bv-safe-right:env(safe-area-inset-right,0px);--bv-safe-bottom:env(safe-area-inset-bottom,0px);--bv-safe-left:env(safe-area-inset-left,0px)}'+
      'body{box-sizing:border-box;padding-left:var(--bv-safe-left);padding-right:var(--bv-safe-right);padding-bottom:var(--bv-safe-bottom)}'+
      '.topbar{padding-top:calc(10px + var(--bv-safe-top));min-height:calc(58px + var(--bv-safe-top));box-sizing:border-box}'+
      '.sideNav{padding-top:var(--bv-safe-top);padding-bottom:var(--bv-safe-bottom);box-sizing:border-box}'+
      '.content{padding-bottom:calc(24px + var(--bv-safe-bottom))}';
    document.head.appendChild(s);
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;const b=button();if(b)b.style.display='none'});
  window.bvUpdateApp=activateUpdate;

  window.bvInstallApp=async function(){
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch(e){}
      deferredPrompt=null;
      const b=button();if(b)b.style.display='none';
      return;
    }
    if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!isStandalone()){
      window.bvModal?.({
        type:'info',icon:'＋',kicker:'BRASABOX',
        title:'Instale o aplicativo',
        message:'No iPhone, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>. Assim você acessa o BrasaBox como aplicativo.',
        button:'Entendi'
      }) || alert('No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');return;
    }
    window.bvModal?.({
      type:'info',icon:'＋',kicker:'BRASABOX',
      title:'Instale o aplicativo',
      message:'Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.',
      button:'Entendi'
    }) || alert('Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
  };

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!hadController||reloading)return;
      reloading=true;
      window.location.reload();
    });
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('./service-worker.js?v=20260927.1400',{scope:'./'});
        if(reg.waiting){waitingWorker=reg.waiting;showUpdate()}
        reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){waitingWorker=w;showUpdate()}})});
        await reg.update();
        hadController=hadController||!!navigator.serviceWorker.controller;
        if(updateTimer)clearInterval(updateTimer);
        updateTimer=setInterval(()=>{try{if(document.visibilityState==='visible')reg.update().catch(()=>{})}catch(e){}},15000);
      }catch(e){}
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){navigator.serviceWorker.getRegistration('./').then(reg=>reg&&reg.update()).catch(()=>{})}});
    window.addEventListener('pageshow',()=>{navigator.serviceWorker.getRegistration('./').then(reg=>reg&&reg.update()).catch(()=>{})});
  }

  document.addEventListener('DOMContentLoaded',()=>{show();applySafeArea()},{once:true});
  window.addEventListener('pageshow',applySafeArea);
})();