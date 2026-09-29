/* BRASABOX — controle robusto do cadastro de produto no mobile */
(function(){
  function lockProductPage(){
    var panel=document.getElementById('productFormPanel');
    var open=panel && (panel.classList.contains('show') || panel.classList.contains('open'));
    document.documentElement.classList.toggle('bvProductLock',!!open);
    document.body.classList.toggle('bvProductLock',!!open);
  }
  function install(){
    var panel=document.getElementById('productFormPanel');
    if(!panel || panel.dataset.bvLockInstalled==='1') return;
    panel.dataset.bvLockInstalled='1';
    new MutationObserver(lockProductPage).observe(panel,{attributes:true,attributeFilter:['class','style']});
    lockProductPage();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  window.BV_PRODUCT_PAGE_LOCK=lockProductPage;
})();
