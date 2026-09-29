/* BRASABOX — ícones com estilo padrão salvo (Vermelho Outline) */
(function(){
  const DEFAULT_STYLE='6';
  function applyDefault(){
    document.documentElement.dataset.bvIconStyle=DEFAULT_STYLE;
    try{localStorage.setItem('bv_icon_style',DEFAULT_STYLE)}catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyDefault,{once:true});
  else applyDefault();
})();