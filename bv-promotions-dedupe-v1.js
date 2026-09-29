/* BRASABOX — deduplicação de promoções v3 */
(()=>{
  'use strict';
  const key=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const uniquePromotions=list=>{
    const seenId=new Set(),seenContent=new Set();
    return (Array.isArray(list)?list:[]).filter(item=>{
      const id=key(item?.id);
      if(id&&seenId.has(id))return false;
      if(id)seenId.add(id);
      const name=key(item?.name);
      const price=Number(item?.promotional_price)||0;
      const start=String(item?.starts_at||'');
      const end=String(item?.ends_at||'');
      const legacy=key(item?.product_id);
      const signature=[name,price,start,end,legacy].join('|');
      if(name&&seenContent.has(signature))return false;
      if(name)seenContent.add(signature);
      return true;
    });
  };
  const normalize=()=>{
    if(Array.isArray(window.promotions))window.promotions=uniquePromotions(window.promotions);
    if(window.promotionItems&&typeof window.promotionItems==='object'){
      const clean={};
      Object.keys(window.promotionItems).forEach(id=>{
        const seen=new Set();
        clean[id]=(Array.isArray(window.promotionItems[id])?window.promotionItems[id]:[]).filter(item=>{
          const product=key(item?.product_id||item?.id);
          const qty=Math.max(1,Number(item?.quantity)||1);
          const sig=product+'|'+qty;
          if(!product||seen.has(sig))return false;
          seen.add(sig);
          return true;
        });
      });
      window.promotionItems=clean;
    }
  };
  const wrap=(name,after)=>{
    const original=window[name];
    if(typeof original!=='function'||original.__bvPromoDedupe)return;
    const wrapped=function(...args){
      if(name!=='BV_REFRESH_PROMOTIONS')normalize();
      const result=original.apply(this,args);
      const finish=()=>{
        try{normalize();after?.()}catch(e){console.warn('[BV PROMO DEDUPE]',e)}
      };
      if(result&&typeof result.then==='function')return result.then(v=>{finish();return v});
      finish();return result;
    };
    wrapped.__bvPromoDedupe=true;
    window[name]=wrapped;
  };
  const rerender=()=>{
    normalize();
    window.renderProducts?.();
    window.renderPromotionsAdmin?.();
    window.renderHomePromoBanner?.();
  };
  let stockChannel=null;
  const bindStockRealtime=()=>{
    try{
      const client=window.supabaseClient||window.supabase||window.client;
      if(!client?.channel)return;
      if(stockChannel)return;
      stockChannel=client.channel('bv-promotions-stock-sync')
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'products'},payload=>{
          if(payload?.new?.stock===payload?.old?.stock)return;
          const category=key(payload?.new?.category);
          if(category!=='bebidas')return;
          window.BV_REFRESH_PROMOTIONS?.().catch?.(()=>{});
          setTimeout(rerender,150);
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'product_flavor_stock'},()=>{
          window.BV_REFRESH_PROMOTIONS?.().catch?.(()=>{});
          setTimeout(rerender,150);
        })
        .subscribe();
    }catch(e){console.warn('[BV PROMO STOCK REALTIME]',e)}
  };
  window.BV_PROMOTIONS_DEDUPE_VERSION='2026.09.27.2800';
  normalize();
  wrap('BV_REFRESH_PROMOTIONS',rerender);
  wrap('renderProducts',normalize);
  wrap('renderPromotionsAdmin',normalize);
  wrap('renderHomePromoBanner',normalize);
  bindStockRealtime();
  setTimeout(bindStockRealtime,500);
  setTimeout(bindStockRealtime,1500);
  setTimeout(rerender,300);
  setTimeout(rerender,1200);
})();