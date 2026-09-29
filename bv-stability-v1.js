/* BRASABOX — estabilidade geral v1
   Camada final independente: navegação, auth, cardápio, carrinho, checkout,
   pedidos, dashboard, taxas, produtos e usuários. */
(()=>{ 
  const $=id=>document.getElementById(id);
  // Cliente Supabase criado pelo módulo de autenticação.
  // Mantemos uma referência segura para que a navegação não quebre se o banco ainda não estiver configurado.
  const sb=window.BV_SUPABASE||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const toast=m=>{const x=$('toast');if(x){x.textContent=String(m);x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}};
  if(!document.getElementById('bvSystemModalInlineStyle')){const st=document.createElement('style');st.id='bvSystemModalInlineStyle';st.textContent=`
#bvSystemModal,#bvCancelConfirmModal{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;background:rgba(0,0,0,.78)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;opacity:0!important;visibility:hidden!important;transition:opacity .18s ease,visibility .18s ease!important}
#bvSystemModal.show,#bvCancelConfirmModal.show{opacity:1!important;visibility:visible!important}
#bvSystemModal .bvSystemModalCard,#bvCancelConfirmModal .bvSystemModalCard{width:min(430px,100%)!important;margin:auto!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:20px!important;background:linear-gradient(145deg,#191c22,#0c0e11)!important;color:#fff!important;box-shadow:0 30px 100px rgba(0,0,0,.7)!important;transform:translateY(8px) scale(.98)!important;transition:transform .18s ease!important}
#bvSystemModal.show .bvSystemModalCard,#bvCancelConfirmModal.show .bvSystemModalCard{transform:translateY(0) scale(1)!important}
#bvSystemModal .bvSystemModalTop,#bvCancelConfirmModal .bvSystemModalTop{display:flex!important;align-items:center!important;gap:13px!important;padding:19px!important;border-bottom:1px solid rgba(255,255,255,.07)!important}
#bvSystemModal .bvSystemModalIcon,#bvCancelConfirmModal .bvSystemModalIcon{width:46px!important;height:46px!important;flex:0 0 46px!important;display:grid!important;place-items:center!important;border-radius:14px!important;background:rgba(229,9,20,.14)!important;border:1px solid rgba(229,9,20,.35)!important;color:#ff5961!important;font-size:20px!important;font-weight:950!important}
#bvSystemModal .bvSystemModalKicker,#bvCancelConfirmModal .bvSystemModalKicker{display:block!important;color:#ff5961!important;font-size:9px!important;font-weight:950!important;letter-spacing:1.4px!important}
#bvSystemModal .bvSystemModalTitle,#bvCancelConfirmModal .bvSystemModalTitle{margin:4px 0 0!important;color:#fff!important;font-size:20px!important;font-weight:950!important}
#bvSystemModal .bvSystemModalBody,#bvCancelConfirmModal .bvSystemModalBody{padding:18px 19px!important;color:#b9bec6!important;font-size:14px!important;line-height:1.55!important}
#bvSystemModal .bvSystemModalBody strong,#bvCancelConfirmModal .bvSystemModalBody strong{color:#fff!important}
#bvSystemModal .bvSystemModalActions,#bvCancelConfirmModal .bvSystemModalActions{display:flex!important;gap:9px!important;padding:0 19px 19px!important}
#bvSystemModal .bvSystemModalBtn,#bvCancelConfirmModal .bvCancelConfirmBtn{flex:1!important;min-height:44px!important;border:1px solid #ff2530!important;border-radius:11px!important;background:linear-gradient(135deg,#ff2530,#b90008)!important;color:#fff!important;font-weight:900!important;box-shadow:0 10px 25px rgba(229,9,20,.18)!important}
#bvCancelConfirmModal .bvCancelKeepBtn{flex:1!important;min-height:44px!important;border:1px solid #343a44!important;border-radius:11px!important;background:#20242a!important;color:#fff!important;font-weight:900!important}
@media(max-width:600px){#bvSystemModal,#bvCancelConfirmModal{padding:12px!important}#bvSystemModal .bvSystemModalCard,#bvCancelConfirmModal .bvSystemModalCard{border-radius:18px!important}#bvSystemModal .bvSystemModalActions,#bvCancelConfirmModal .bvSystemModalActions{flex-direction:column!important;padding:0 16px 16px!important}#bvSystemModal .bvSystemModalBtn,#bvCancelConfirmModal .bvCancelConfirmBtn,#bvCancelConfirmModal .bvCancelKeepBtn{width:100%!important}}
`;document.head.appendChild(st)};window.bvModal=(opts={},onClose)=>{
    const old=document.getElementById('bvSystemModal');if(old)old.remove();
    const type=opts.type==='success'?'success':'info';
    const wrap=document.createElement('div');wrap.id='bvSystemModal';wrap.className='bvSystemModal '+type;
    wrap.innerHTML='<div class="bvSystemModalCard" role="dialog" aria-modal="true">'+
      '<div class="bvSystemModalTop"><div class="bvSystemModalIcon">'+String(opts.icon||'✓')+'</div><div><span class="bvSystemModalKicker">'+String(opts.kicker||'BRASABOX')+'</span><h3 class="bvSystemModalTitle">'+esc(opts.title||'Aviso')+'</h3></div></div>'+
      '<div class="bvSystemModalBody">'+String(opts.message||'')+'</div>'+
      '<div class="bvSystemModalActions"><button type="button" class="bvSystemModalBtn">'+esc(opts.button||'OK')+'</button></div></div>';
    document.body.appendChild(wrap);
    const close=()=>{wrap.classList.remove('show');setTimeout(()=>wrap.remove(),180);if(typeof onClose==='function')onClose()};
    wrap.querySelector('.bvSystemModalBtn')?.addEventListener('click',close);
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    requestAnimationFrame(()=>wrap.classList.add('show'));
    setTimeout(()=>wrap.querySelector('.bvSystemModalBtn')?.focus(),80);
    return {close};
  };
  window.BV_CONFIRM_CANCEL_ORDER=window.BV_CONFIRM_CANCEL_ORDER||function(o){
    return new Promise(resolve=>{
      const old=document.getElementById('bvCancelConfirmModal');if(old)old.remove();
      const wrap=document.createElement('div');wrap.id='bvCancelConfirmModal';wrap.className='show';
      wrap.innerHTML='<div class="bvSystemModalCard" role="dialog" aria-modal="true"><div class="bvSystemModalTop"><div class="bvSystemModalIcon">⚠️</div><div><span class="bvSystemModalKicker">CANCELAMENTO DE PEDIDO</span><h3 class="bvSystemModalTitle">Cancelar pedido?</h3></div></div><div class="bvSystemModalBody">Tem certeza que deseja cancelar o pedido <strong>#'+esc(o?.order_number||'')+'</strong>? Esta ação não poderá ser desfeita.</div><div class="bvSystemModalActions"><button type="button" class="bvCancelKeepBtn">Voltar</button><button type="button" class="bvCancelConfirmBtn">Cancelar pedido</button></div></div>';
      document.body.appendChild(wrap);
      let done=false;const finish=v=>{if(done)return;done=true;wrap.classList.remove('show');setTimeout(()=>wrap.remove(),180);resolve(v)};
      wrap.querySelector('.bvCancelKeepBtn')?.addEventListener('click',()=>finish(false));
      wrap.querySelector('.bvCancelConfirmBtn')?.addEventListener('click',()=>finish(true));
      wrap.addEventListener('click',e=>{if(e.target===wrap)finish(false)});
      requestAnimationFrame(()=>wrap.classList.add('show'));
    });
  };
  window.BV_CONFIRM_DELETE_PROMOTION=window.BV_CONFIRM_DELETE_PROMOTION||function(p){
    return new Promise(resolve=>{
      const old=document.getElementById('bvCancelConfirmModal');if(old)old.remove();
      const wrap=document.createElement('div');wrap.id='bvCancelConfirmModal';wrap.className='show';
      wrap.innerHTML='<div class="bvSystemModalCard" role="dialog" aria-modal="true"><div class="bvSystemModalTop"><div class="bvSystemModalIcon">🗑️</div><div><span class="bvSystemModalKicker">EXCLUSÃO DE PROMOÇÃO</span><h3 class="bvSystemModalTitle">Excluir promoção?</h3></div></div><div class="bvSystemModalBody">Tem certeza que deseja excluir a promoção <strong>'+esc(p?.name||'esta promoção')+'</strong>? Esta ação não poderá ser desfeita.</div><div class="bvSystemModalActions"><button type="button" class="bvCancelKeepBtn">Voltar</button><button type="button" class="bvCancelConfirmBtn">Excluir promoção</button></div></div>';
      document.body.appendChild(wrap);
      let done=false;const finish=v=>{if(done)return;done=true;wrap.classList.remove('show');setTimeout(()=>wrap.remove(),180);resolve(v)};
      wrap.querySelector('.bvCancelKeepBtn')?.addEventListener('click',()=>finish(false));
      wrap.querySelector('.bvCancelConfirmBtn')?.addEventListener('click',()=>finish(true));
      wrap.addEventListener('click',e=>{if(e.target===wrap)finish(false)});
      requestAnimationFrame(()=>wrap.classList.add('show'));
    });
  };
  if(!$('bvDeliveryCardStyle')){
    const st=document.createElement('style');st.id='bvDeliveryCardStyle';st.textContent='.bvDeliveryCard .orderBody{display:grid;gap:10px}.bvOrderCustomer{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.bvOrderCustomer b{font-size:18px}.bvOrderCustomer span{font-size:12px;opacity:.7;text-align:right}.bvOrderItems{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.035)}.bvOrderItems small,.bvDeliveryTitle{font-size:10px;font-weight:900;letter-spacing:.12em;opacity:.65}.bvOrderItems p{margin:5px 0 0;line-height:1.45}.bvDeliveryBox{padding:13px 14px;border-radius:14px;background:rgba(229,9,20,.06);border:1px solid rgba(229,9,20,.18)}.bvAddressMain{margin-top:5px;font-weight:850;line-height:1.35}.bvAddressSub{margin-top:3px;font-size:13px;opacity:.75}.orderPaymentBadge{margin-top:0!important}.bvDeliveryCard .orderFoot{display:flex;align-items:end;justify-content:space-between;gap:12px}.bvDeliveryCard .orderFoot>div{display:flex;flex-direction:column;gap:3px}.bvDeliveryCard .orderFoot small{font-size:10px;letter-spacing:.1em;opacity:.65}.bvDeliveryCard .orderFoot strong{font-size:21px}@media(max-width:600px){.bvOrderCustomer{display:block}.bvOrderCustomer span{display:block;text-align:left;margin-top:3px}.bvDeliveryCard .orderFoot{align-items:stretch;flex-direction:column}.bvDeliveryCard .orderFoot select{width:100%}}';document.head.appendChild(st);
  }

  if(!$('bvFlavorStockStyle')){const st=document.createElement('style');st.id='bvFlavorStockStyle';st.textContent='.flavorStock{width:100%;max-width:100%;box-sizing:border-box;margin:10px 0 2px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.035);overflow:hidden}.flavorStock>span{display:block;margin-bottom:8px;color:#8f96a0;font-size:9px;font-weight:950;letter-spacing:1.2px;text-transform:uppercase}.flavorStockGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;width:100%;box-sizing:border-box}.flavorStockItem{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;width:100%;box-sizing:border-box;padding:7px 8px;border-radius:9px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.055)}.flavorStockItem span{font-size:11px;font-weight:800;color:#dfe2e6;white-space:nowrap}.flavorStockItem strong{min-width:25px;text-align:center;padding:3px 6px;border-radius:6px;background:rgba(229,9,20,.12);border:1px solid rgba(229,9,20,.22);color:#ff5961;font-size:12px;font-weight:950}.flavorStockItem strong:empty{display:none}@media(max-width:600px){.flavorStock{padding:10px}.flavorStockGrid{gap:6px}.flavorStockItem{padding:8px 7px}.flavorStockItem span{font-size:10px}}';document.head.appendChild(st);}
  const promoFocusStyle=document.createElement('style');promoFocusStyle.textContent='.homePromoSlide{cursor:pointer}.homePromoSlide:focus-visible{outline:2px solid #ff4750;outline-offset:3px}.promotionCatalogCard.bvPromotionFocus{outline:2px solid #e50914;box-shadow:0 0 0 5px rgba(229,9,20,.16),0 18px 45px rgba(229,9,20,.25);transition:outline .2s,box-shadow .2s}';document.head.appendChild(promoFocusStyle);
  const orderCategoryStyle=document.createElement('style');orderCategoryStyle.textContent='.bvOrderItemGroup{padding:7px 0}.homePromoGroup{display:flex;flex-direction:column;gap:2px;margin-top:5px}.homePromoGroup small{font-size:10px;font-weight:900;letter-spacing:.08em;opacity:.85}.homePromoGroup span{font-size:13px;font-weight:700}.bvOrderItemGroup+ .bvOrderItemGroup{border-top:1px solid rgba(255,255,255,.07);margin-top:4px}.bvOrderItemGroup small{display:block;font-size:9px!important;font-weight:950!important;letter-spacing:.12em;color:#ff5b64!important}.bvOrderItemGroup p{margin:4px 0 0;line-height:1.45}';document.head.appendChild(orderCategoryStyle);
  const cartCategoryStyle=document.createElement('style');cartCategoryStyle.textContent='.cartCategoryLabel{display:block!important;margin:0 0 3px;font-size:9px!important;font-weight:950!important;letter-spacing:.12em;color:#ff5b64!important;text-transform:uppercase}.cartInfo b{display:block}';document.head.appendChild(cartCategoryStyle);
  const catalogStockStyle=document.createElement('style');catalogStockStyle.textContent='.catalogStock{margin:10px 0;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px}.catalogStock span{font-size:9px;font-weight:900;letter-spacing:.12em;opacity:.65}.catalogStock strong{font-size:16px}.catalogStock small{font-size:10px;opacity:.65}.catalogStock.out{border-color:rgba(229,9,20,.5);background:rgba(229,9,20,.1)}.catalogStock.out strong,.catalogStock.out em{color:#ff5b64}.catalogStock em{font-size:9px;font-weight:900;font-style:normal;letter-spacing:.08em}.productOutOfStock .productImage{opacity:.55}.productOutOfStock h3{opacity:.7}.addDisabled{opacity:.5!important;cursor:not-allowed!important;background:#555!important;border-color:#666!important}';document.head.appendChild(catalogStockStyle);
  const prodStyle=document.createElement('style');prodStyle.textContent=`    .adminStockBox{margin:12px 0 4px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:12px}
    .adminStockBox>span{font-size:10px;font-weight:900;letter-spacing:.12em;opacity:.7}
    .adminStockControls{display:flex;align-items:center;gap:8px}
    .adminStockControls button{width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(255,255,255,.08);color:#fff;font-size:24px;font-weight:900;line-height:1;cursor:pointer}
    .adminStockControls button:active{transform:scale(.94)}
    .adminStockControls .stockPlus{background:rgba(229,9,20,.18);border-color:rgba(229,9,20,.45)}
    .adminStockControls strong{min-width:42px;text-align:center;font-size:20px}

    #orders .bvProductionTime{display:block;margin-top:4px;font-size:10px;color:#8d919b}
    #orders .bvProductionAddress{margin-top:12px;padding:12px 13px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
    #orders .bvProductionAddress b{display:block;margin-top:4px;font-size:13px;line-height:1.45}
    #orders .bvPreparingOrdersSection .bvProductionSectionHead{background:rgba(255,255,255,.045)}
    #orders .bvPreparingOrdersSection .bvProductionSectionHead strong{background:#2b2e36}
    #orders .bvProductionSection{margin:0 0 22px}
    #orders .bvProductionSectionHead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 12px;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
    #orders .bvProductionSectionHead>div{display:flex;flex-direction:column;gap:4px}
    #orders .bvProductionSectionHead span{font-size:18px;font-weight:900;letter-spacing:.02em}
    #orders .bvProductionSectionHead small{font-size:12px;color:#9699a3}
    #orders .bvProductionSectionHead strong{min-width:42px;height:42px;display:grid;place-items:center;border-radius:13px;font-size:19px;background:#22242b}
    #orders .bvNewOrdersSection .bvProductionSectionHead{background:linear-gradient(135deg,rgba(229,9,20,.20),rgba(255,92,0,.10));border:2px solid rgba(229,9,20,.72);box-shadow:0 0 0 1px rgba(229,9,20,.08),0 14px 34px rgba(229,9,20,.12)}
    #orders .bvNewOrdersSection .bvProductionSectionHead span{font-size:22px}
    #orders .bvNewOrdersSection .bvProductionSectionHead strong{background:#e50914;color:#fff;box-shadow:0 8px 20px rgba(229,9,20,.28)}
    #orders .bvProductionGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
    #orders .bvNewOrderCard{position:relative;overflow:hidden;border:2px solid rgba(229,9,20,.72)!important;box-shadow:0 14px 34px rgba(229,9,20,.16)}
    #orders .bvNewOrderRibbon{padding:11px 14px;background:#e50914;color:#fff;font-weight:950;font-size:15px;letter-spacing:.04em}
    #orders .bvNewOrderCard .orderHead{padding-top:15px}
    #orders .bvNewStatusBadge{background:#e50914!important;color:#fff!important;font-weight:950!important}
    #orders .bvStartOrderBtn{width:100%;min-height:54px;border:0;border-radius:15px;background:#e50914;color:#fff;font-size:17px;font-weight:950;letter-spacing:.02em;cursor:pointer;box-shadow:0 10px 24px rgba(229,9,20,.25)}
    #orders .bvStartOrderBtn:active{transform:scale(.98)}
    #orders .bvProductionOrderCard{opacity:.88}
    #orders .bvProductionLocked{font-size:11px;color:#777b86;text-align:right}
    @media(max-width:650px){
      #orders .bvProductionGrid{grid-template-columns:1fr}
      #orders .bvProductionSectionHead span{font-size:17px}
      #orders .bvNewOrdersSection .bvProductionSectionHead span{font-size:20px}
      #orders .bvStartOrderBtn{min-height:58px;font-size:18px}
    }
  `;document.head.appendChild(prodStyle);
  window.BV_STABILITY_VERSION='2026.09.26.359';
  window.BV_PIX_QR_TIMER=null;
  window.BV_PIX_QR_INFLIGHT=null;
  window.ensurePixQr=async(order)=>{
    const o=order||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')));
    if(!o||String(o.payment||'').toLowerCase()!=='pix'||String(o.paymentStatus||'').toLowerCase()==='pago')return false;
    if(o.pixQrCode)return true;
    if(window.BV_PIX_QR_INFLIGHT)return window.BV_PIX_QR_INFLIGHT;
    const run=(async()=>{
      try{
        const sbx=sb||window.BV_SUPABASE;
        if(!sbx)return false;
        const r=await sbx.functions.invoke('criar-pix',{body:{order_id:o.id}});
        if(r.error||r.data?.error){
          console.warn('[BV PIX QR] geração falhou',r.error||r.data);
          return false;
        }
        const d=r.data||{};
        if(d.qr_code||d.qr_code_base64){
          o.pixPaymentId=d.mercado_pago_order_id||d.pix_payment_id||o.pixPaymentId||null;
          o.pixQrCode=d.qr_code||o.pixQrCode||'';
          o.pixQrCodeBase64=d.qr_code_base64||o.pixQrCodeBase64||'';
          o.pixExpiresAt=d.expires_at||o.pixExpiresAt||null;
          return true;
        }
        return false;
      }catch(e){
        console.warn('[BV PIX QR]',e);
        return false;
      }finally{window.BV_PIX_QR_INFLIGHT=null}
    })();
    window.BV_PIX_QR_INFLIGHT=run;
    return run;
  };
  window.startPixQrRecovery=order=>{
    if(window.BV_PIX_QR_TIMER)clearTimeout(window.BV_PIX_QR_TIMER);
    const tick=async()=>{
      const o=order||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')));
      if(!o||String(o.payment||'').toLowerCase()!=='pix'||String(o.paymentStatus||'').toLowerCase()==='pago'||o.pixQrCode){window.BV_PIX_QR_TIMER=null;return}
      const ok=await window.ensurePixQr(o);
      if(ok){
        window.BV_TRACKING_RENDER_SIG='';
        window.renderTracking(o);
        window.BV_PIX_QR_TIMER=null;
        return;
      }
      window.BV_PIX_QR_TIMER=setTimeout(tick,4000);
    };
    window.BV_PIX_QR_TIMER=setTimeout(tick,800);
  };

  if(!$('bvTrackingCardStyle')){const st=document.createElement('style');st.id='bvTrackingCardStyle';st.textContent='.trackingCardFixed{padding:18px!important;overflow:hidden}.trackingCardFixed .trackingCardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08)}.trackingCardFixed .trackingCardTop small,.trackingCardFixed .trackingCardSection>small{font-size:9px;font-weight:950;letter-spacing:.12em;color:#ff5b64}.trackingCardFixed .trackingCardTop h3{margin:4px 0 0;font-size:25px}.trackingStatusPill{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:950;white-space:nowrap;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1)}.trackingStatusPill.recebido{color:#ffd166}.trackingStatusPill.em-preparo,.trackingStatusPill.em-producao{color:#ffb86b}.trackingStatusPill.saiu-entrega{color:#72b7ff}.trackingStatusPill.entregue{color:#65e6a1}.trackingStatusPill.cancelado{color:#ff737d}.trackingProgress{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:18px 0}.trackingProgressStep{text-align:center;opacity:.38}.trackingProgressStep.done{opacity:1}.trackingProgressStep span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;background:#20242a;border:1px solid #30343b;font-size:11px}.trackingProgressStep.done span{background:#e50914;border-color:#e50914;color:#fff}.trackingProgressStep small{font-size:9px;font-weight:800}.trackingItems{margin-top:7px}.trackingCardTotal{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.08)}.trackingCardTotal strong{font-size:20px}.trackingPayment{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px}.trackingPix{margin-top:14px;padding:14px;border-radius:14px;text-align:center}.trackingPix.waiting{border:1px solid rgba(0,200,120,.22);background:rgba(0,120,80,.08)}.trackingPix.paid{border:1px solid rgba(0,200,120,.25);background:rgba(0,160,90,.12)}.trackingPix b,.trackingPix small{display:block}.trackingPix small{margin-top:4px}.trackingPix img{width:min(220px,70vw);display:block;margin:12px auto;border-radius:12px;background:#fff;padding:7px}.trackingPix button{width:100%;margin-top:8px;padding:11px;border:0;border-radius:10px;background:#e50914;color:#fff;font-weight:900}@media(max-width:760px){.trackingGrid{grid-template-columns:1fr}.trackingCardFixed .trackingCardTop{gap:8px}.trackingStatusPill{font-size:10px;max-width:48%;white-space:normal;text-align:center}.trackingProgressStep small{font-size:8px}}';document.head.appendChild(st)}  const firstLoginDone=()=>{try{return localStorage.getItem('bv_first_login_done')==='1'}catch(e){return false}};
  window.BV_HAS_NAVIGATED=false;
  const NAV_KEY='bv_current_page';
  const getSavedPage=()=>{try{return String(localStorage.getItem(NAV_KEY)||'').trim()}catch(e){return ''}};
  const savePage=p=>{try{if(p)localStorage.setItem(NAV_KEY,String(p))}catch(e){}};
  const clearSavedPage=()=>{try{localStorage.removeItem(NAV_KEY)}catch(e){}};
  // Mantém a tela atual após F5/recarregamento. A restauração acontece depois da autenticação e do perfil.

  try{window.cart=Array.isArray(window.cart)?window.cart:(JSON.parse(localStorage.getItem('bv_cart')||'[]')||[])}catch{window.cart=[]}
  try{window.products=Array.isArray(window.products)?window.products:(JSON.parse(localStorage.getItem('bv_products')||'[]')||[])}catch{window.products=[]}
  if(!Array.isArray(window.orders))window.orders=[];
  const sb=window.BV_SUPABASE||(window.supabase&&window.BV_SUPABASE_CONFIG?supabase.createClient(window.BV_SUPABASE_CONFIG.url,window.BV_SUPABASE_CONFIG.publishableKey):null);
  if(sb)window.BV_SUPABASE=sb;

  const labels={inicio:'Início',cardapio:'Cardápio',pedido:'Meu pedido',acompanhar:'Acompanhar pedido',dashboard:'Dashboard',pedidos:'Pedidos',produtos:'Produtos',promocoes:'Promoções',cupons:'Cupons',config:'Configurações','taxa-entrega':'Taxa de entrega'};
  const status={recebido:'Liberado',aguardando_pagamento:'Aguardando pagamento',em_preparo:'Em preparo',em_producao:'Pronto',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'};
  const payLabel={pix:'Pix',dinheiro:'Dinheiro',cartao:'Cartão'};

  window.admin=()=>['administrador','admin'].includes(window.BV_ROLE);
  window.applyAccess=()=>{
    const role=String(window.BV_ROLE||'usuario').trim().toLowerCase();
    window.BV_ROLE=role;
    document.querySelectorAll('.adminOnly').forEach(x=>x.style.display=['administrador','admin'].includes(role)?'':'none');
    document.querySelectorAll('.adminHide').forEach(x=>x.style.display=['administrador','admin'].includes(role)?'none':'');
    document.querySelectorAll('[data-role="motoboyOnly"]').forEach(x=>x.style.display=role==='motoboy'?'':'none');
    if(role==='motoboy'){
      // O motoboy não possui tela Início/Cardápio/Meu pedido/Acompanhar.
      // A área dele começa diretamente em Pedidos e só permite Pedidos + Taxa de entrega.
      const motoAllowed=new Set(['pedidos','taxa-entrega']);
      document.querySelectorAll('.sideNav [data-page]').forEach(x=>{
        const page=String(x.dataset.page||'');
        const adminLink=x.classList.contains('adminOnly')||x.classList.contains('adminDeliveryFeeLink');
        x.style.setProperty('display',motoAllowed.has(page)&&!adminLink?'':'none','important');
      });
      document.querySelectorAll('.sideNav .navTitle,.sideBottom .adminOnly').forEach(x=>x.style.setProperty('display','none','important'));
      document.querySelector('.cartTop')?.style.setProperty('display','none','important');

      // Esconde as páginas que não pertencem ao motoboy e nunca deixa Início ficar ativa.
      document.querySelectorAll('.page').forEach(page=>{
        const id=String(page.id||'');
        const name=id.replace(/^page-/,'');
        if(!motoAllowed.has(name)) page.style.setProperty('display','none','important');
      });
      const active=document.querySelector('.page.activePage');
      const activeName=String(active?.id||'').replace(/^page-/,'');
      if(active && !motoAllowed.has(activeName)) active.classList.remove('activePage');
    }
    window.renderLoggedUser?.();
  };
  window.renderLoggedUser=()=>{const el=$('loggedUserName');if(!el)return;const name=String(window.BV_USER_NAME||'').trim();el.textContent=name?name:'Usuário';el.title=name||'Usuário logado';el.style.display='inline-flex';};
  window.toggleSidebar=()=>{$('sidebar')?.classList.toggle('open')};
  window.openAdmin=p=>{if(!window.admin())return toast('Acesso restrito ao administrador.');window.showPage(p||'dashboard')};
  window.showPage=async(p,internal=false)=>{
    const role=String(window.BV_ROLE||'').toLowerCase();
    if(role==='motoboy' && !['pedidos','taxa-entrega'].includes(String(p))) p='pedidos';
    if(!internal){window.BV_HAS_NAVIGATED=true;savePage(p)}
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('activePage'));
    $('page-'+p)?.classList.add('activePage');
    if($('pageTitle'))$('pageTitle').textContent=labels[p]||p;
    document.querySelectorAll('.sideNav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
    if(innerWidth<=850)$('sidebar')?.classList.remove('open');
    if(p==='inicio'){window.renderHomePromoBanner?.();window.BV_REFRESH_PROMOTIONS?.().catch?.(()=>{});}
    if(p==='cardapio'){if(!window.BV_CAT){const active=document.querySelector('#page-cardapio .menuCategoryTabs button.active');window.BV_CAT=active?.dataset.menuCategory||'Lanches'}await window.BV_REFRESH_PRODUCTS?.();}
    if(p==='pedido'){window.initPaymentSelection?.();window.renderCart();setTimeout(window.loadProfile,50)}
    if(p==='acompanhar'){window.BV_REFRESH_ORDERS?.();window.setupTrackingRealtime?.();window.startTrackingStatusPolling?.();}
    if(p==='dashboard')window.renderDashboard();
    if(p==='pedidos'){if(window.BV_ROLE==='motoboy')window.renderMotoOrders?.();else window.renderAdmin()}
    if(p==='taxa-entrega'){if(['administrador','admin','motoboy'].includes(role))window.renderMotoFeeOrders?.();else window.renderDeliveryFees?.()}
    if(p==='produtos'){const el=$('page-produtos');if(!el)return;el.classList.add('activePage');const manage=$('manage');if(manage&&!manage.innerHTML.trim())manage.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando produtos...</b><small>Aguarde um instante.</small></div>';try{window.renderProductsAdmin?.()}catch(e){console.error('[BV PRODUTOS RENDER]',e)};Promise.resolve(window.BV_REFRESH_PRODUCTS?.()).then(()=>{try{window.renderProductsAdmin?.()}catch(e){console.error('[BV PRODUTOS FINAL]',e)}}).catch(e=>{console.error('[BV PRODUTOS SYNC]',e);try{window.renderProductsAdmin?.()}catch(_){}});}
    if(p==='promocoes'){await window.BV_REFRESH_PROMOTIONS?.();window.renderPromotionsAdmin?.();}
    if(p==='config'){window.refreshDeliveryFees();window.renderUsers?.()}
  };

  window.renderMotoFeeOrders=async()=>{
    if(!['motoboy','administrador','admin'].includes(window.BV_ROLE))return;
    const b=$('motoFeeOrders');if(!b||!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const isAdmin=['administrador','admin'].includes(window.BV_ROLE);
      const q=sb.from('orders').select('id,order_number,delivery_fee,created_at,motoboy_id').eq('status','entregue').order('created_at',{ascending:false});
      if(!isAdmin)q.eq('motoboy_id',user.id);
      const r=await q;
      if(r.error)throw r.error;
      const rows=r.data||[];
      const filter=window.BV_MOTO_FEE_FILTER||'all';
      const now=new Date();const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      let startDate=null,endDate=null,specific=null;
      if(filter==='today')startDate=startOfDay;
      if(filter==='week'){const day=startOfDay.getDay();startDate=new Date(startOfDay);startDate.setDate(startDate.getDate()-(day===0?6:day-1));}
      if(filter==='month')startDate=new Date(now.getFullYear(),now.getMonth(),1);
      if(filter.startsWith('specific:'))specific=filter.slice(9);
      if(specific){const parts=specific.split('-').map(Number);startDate=new Date(parts[0],parts[1]-1,parts[2]);endDate=new Date(parts[0],parts[1]-1,parts[2]+1);}
      const filtered=specific?rows.filter(o=>{const d=new Date(o.created_at);return d>=startDate&&d<endDate}):startDate?rows.filter(o=>new Date(o.created_at)>=startDate):rows;
      const totalFees=filtered.reduce((sum,o)=>sum+Number(o.delivery_fee||0),0);
      const fmtDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')};
      const title=isAdmin?'ADMINISTRAÇÃO':'MOTOBOY';
      const emptyText=isAdmin?'Escolha outro filtro para consultar as taxas das entregas.':'Escolha outro filtro para consultar suas taxas.';
      if($('deliveryFeeEyebrow'))$('deliveryFeeEyebrow').textContent=title;
      if($('deliveryFeeDescription'))$('deliveryFeeDescription').textContent=isAdmin?'Consulte o total das taxas de todas as entregas realizadas.':'Consulte o total das suas taxas das entregas realizadas.';
      b.innerHTML='<div class="motoFeeFilter"><div class="motoFeeQuickFilters"><button type="button" class="'+(filter==='today'?'active':'')+'" onclick="setMotoFeeFilter(\'today\')">Hoje</button><button type="button" class="'+(filter==='week'?'active':'')+'" onclick="setMotoFeeFilter(\'week\')">Esta semana</button><button type="button" class="'+(filter==='month'?'active':'')+'" onclick="setMotoFeeFilter(\'month\')">Este mês</button><button type="button" class="'+(filter==='all'?'active':'')+'" onclick="setMotoFeeFilter(\'all\')">Todas</button></div><label><span>Data específica</span><input id="motoFeeDate" type="date" value="'+(specific||'')+'" onchange="setMotoFeeSpecificDate(this.value)"></label></div>'+
        '<div class="motoFeeHeader"><div><small>ENTREGAS REALIZADAS</small><strong>'+filtered.length+'</strong></div><div><small>'+(isAdmin?'TOTAL DE TAXAS':'TOTAL A RECEBER')+'</small><strong>'+money(totalFees)+'</strong></div></div>'+
        (filtered.length?'<div class="motoFeeList">'+filtered.map(o=>'<article class="motoFeeOrder"><div class="motoFeeOrderNumber"><small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b><small>DATA</small><b>'+fmtDate(o.created_at)+'</b></div><div class="motoFeeValue"><small>TAXA DE ENTREGA</small><strong>'+money(o.delivery_fee)+'</strong></div></article>').join('')+'</div>':'<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b><small>'+emptyText+'</small></div>');
    }catch(e){console.error('Delivery fee orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>'}
  };
  window.setMotoFeeFilter=filter=>{window.BV_MOTO_FEE_FILTER=filter||'all';window.renderMotoFeeOrders()};
  window.setMotoFeeSpecificDate=value=>{window.BV_MOTO_FEE_FILTER=value?'specific:'+value:'all';window.renderMotoFeeOrders()};

  window.setMenuCategory=async(cat,b)=>{window.BV_MENU_CATEGORY=cat;document.querySelectorAll('#page-cardapio .menuCategoryTabs button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_CAT=cat;if(cat==='Promocoes'&&window.BV_REFRESH_PROMOTIONS)await window.BV_REFRESH_PROMOTIONS();await window.renderProducts()};
  window.renderProducts=async()=>{const b=$('products');if(!b)return;if(window.BV_MENU_CATEGORY==='Promocoes'&&window.BV_REFRESH_PROMOTIONS&&!(window.promotions||[]).length)await window.BV_REFRESH_PROMOTIONS();const refri=(window.products||[]).find(x=>norm(x?.name)==='refri 2l');if(refri)await window.BV_REFRESH_FLAVOR_STOCKS?.();if(window.BV_MENU_CATEGORY==='Promocoes'){const now=Date.now(),active=(window.promotions||[]).filter(x=>x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)),ps=window.products||[];b.innerHTML=active.length?active.map(x=>{const items=window.promotionItems?.[x.id]||[],legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[],resolvedPromo=(items.length?items:legacy).map(i=>{const p=ps.find(y=>String(y.id)===String(i.product_id));return {p,q:Math.max(1,Number(i.quantity)||1)}}).filter(v=>v.p);const grouped=['Lanches','Bebidas','Adicionais'].map(cat=>{const rows=resolvedPromo.filter(v=>String(v.p.category||'Lanches')===cat);if(!rows.length)return '';return '<div class="bvOrderItemGroup"><small>'+cat.toUpperCase()+'</small><p>'+esc(rows.map(v=>v.q+'x '+v.p.name).join(' • '))+'</p></div>'}).join('');return '<article class="productCard promotionCatalogCard" data-promotion-id="'+esc(x.id)+'" role="button" tabindex="0" onclick="BV_OPEN_PROMOTION(\''+esc(x.id)+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();BV_OPEN_PROMOTION(\''+esc(x.id)+'\')}"><div class="productImage"><span>🏷️</span></div><div class="promoCatalogBody"><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'Oferta especial do BrasaBox')+'</p><div class="promotionCatalogItems">'+grouped+'</div><div class="promotionCatalogPrice"><del>'+money(x.original_price||0)+'</del><strong>'+money(x.promotional_price||0)+'</strong></div><button type="button" class="promoCatalogButton" onclick="event.stopPropagation();addPromotionToCart(\''+esc(x.id)+'\')">Adicionar promoção</button></div></article>'}).join(''):'<div class="emptyState"><span>🏷️</span><b>Nenhuma promoção ativa.</b><small>As promoções aparecerão aqui enquanto estiverem ativas.</small></div>';return;}
    b.innerHTML='';
    const cat=window.BV_CAT||'Lanches';
    const a=(window.products||[]).filter(p=>p.active!==false&&String(p.category||'Lanches')===cat);
    const now=Date.now();
    b.innerHTML=a.length?a.map(p=>{
      const fallback=p.category==='Bebidas'?'🥤':'🍔';
      const promo=(window.promotions||[]).find(x=>String(x.product_id)===String(p.id)&&x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));
      const addonKey=String(p.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const addonPos={bacon:'0% 0%',ovo:'25% 0%',cheddar:'50% 0%',requeijao:'75% 0%',bife:'100% 0%',calabresa:'0% 100%',milho:'25% 100%',batata:'50% 100%',mussarela:'75% 100%',presunto:'100% 100%'};
      const isRefrigerante=String(p.category||'')==='Bebidas'&&/coca|refri|refrigerante/i.test(String(p.name||''));
      const isRefri2L=/^refri\s*2\s*(l|litros?)$/.test(norm(p.name));
      const isCoca2L=/^coca\s*-?\s*cola\s*2\s*(litros?|l)$/i.test(String(p.name||''));
      const coca2LImage='https://andinacocacola.vtexassets.com/arquivos/ids/158758-800-auto?aspect=true&height=auto&v=639156020671730000&width=800';
      const genericRefri2LImage='assets/refri-2l-sem-marca.svg';
      const media=(isCoca2L?'<img src="'+coca2LImage+'" alt="'+esc(p.name)+'" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+'<span style="display:none">'+fallback+'</span>':isRefri2L?'<img src="'+genericRefri2LImage+'" alt="Garrafa PET de refrigerante 2 litros sem marca" loading="eager" decoding="async">'+'<span style="display:none">'+fallback+'</span>':(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" loading="lazy" decoding="async">'+'<span style="display:none">'+fallback+'</span>':'<span>'+fallback+'</span>'));
      const stock=Math.max(0,Number(p.stock)||0);
      const gs=Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::guarana']??0),ls=Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::laranja']??0);
      const outOfStock=isRefri2L?(gs<=0&&ls<=0):(String(p.category||'')==='Bebidas'&&stock<=0);
      const stockHtml=(isRefri2L||isCoca2L)?'':(isRefrigerante?'<div class="catalogStock '+(outOfStock?'out':'')+'"><span>ESTOQUE</span><strong>'+stock+'</strong>'+(outOfStock?'<em>ESGOTADO</em>':'<small>disponível</small>')+'</div>':'');
      const priceHtml='<b>'+money(p.price)+'</b>';
      const addButton=outOfStock?'<button type="button" disabled class="addDisabled">Esgotado</button>':'<button type="button" onclick="'+(isRefri2L?'BV_OPEN_FLAVOR_PICKER(\''+esc(p.id)+'\')':'addToCart(\''+esc(p.id)+'\')')+'">+ Adicionar</button>';
      return '<article class="productCard product '+(outOfStock?'productOutOfStock':'')+'">'+(promo?'<div class="promoBadge">🔥 PROMOÇÃO</div>':'')+'<div class="productImage">'+media+'</div><div class="productInfo"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'')+'</p>'+stockHtml+'<div class="productBottom">'+priceHtml+addButton+'</div></div></article>';
    }).join(''):'<div class="panel"><p class="muted">Nenhum produto disponível nesta categoria.</p></div>';
  };
  window.addPromotionToCart=async id=>{const promo=(window.promotions||[]).find(x=>String(x.id)===String(id));if(!promo)return toast('Promoção não encontrada.');const now=Date.now();if(!promo.active||(promo.starts_at&&new Date(promo.starts_at).getTime()>now)||(promo.ends_at&&new Date(promo.ends_at).getTime()<now))return toast('Esta promoção não está mais ativa.');const items=window.promotionItems?.[promo.id]||[];const legacy=promo.product_id?[{product_id:promo.product_id,quantity:1}]:[];const rows=items.length?items:legacy;if(!rows.length)return toast('Esta promoção não possui itens.');const ps=window.products||[];const resolved=rows.map(i=>({p:ps.find(p=>String(p.id)===String(i.product_id)),q:Math.max(1,Number(i.quantity)||1)}));if(resolved.some(x=>!x.p))return toast('Não foi possível localizar todos os itens da promoção.');const refriItems=resolved.filter(x=>norm(x.p.name)==='refri 2l');if(refriItems.length){const stockReady=await window.BV_REFRESH_FLAVOR_STOCKS?.();if(!stockReady)return toast('Não foi possível consultar o estoque de sabores.');try{await window.BV_OPEN_PROMO_FLAVOR_PICKER?.(promo.id,refriItems)}catch(e){console.error('[BV PROMO FLAVOR]',e);return toast('Não foi possível abrir a escolha do sabor.')}return;}const key='promo:'+promo.id;const r=window.cart.find(x=>x.id===key);if(r)r.q=(Number(r.q)||0)+1;else window.cart.push({id:key,name:'🎁 '+promo.name,price:Number(promo.promotional_price)||0,q:1,isPromotion:true,promotionId:promo.id,promotionItems:resolved.map(x=>({id:x.p.id,name:x.p.name,quantity:x.q}))});saveCart();toast('Promoção adicionada ao pedido por '+money(promo.promotional_price)+'.');showPage('pedido')};
window.BV_OPEN_PROMO_FLAVOR_PICKER=async(promoId,refriItems)=>{
    let m=$('bvFlavorModal');
    if(!m){
      const refri=(window.products||[]).find(p=>norm(p?.name)==='refri 2l');
      if(!refri)return toast('Produto Refri 2L não encontrado.');
      await window.BV_OPEN_FLAVOR_PICKER?.(refri);
      m=$('bvFlavorModal');
    }
    if(!m)return toast('Não foi possível abrir a seleção de sabor.');
    const refri=refriItems?.find(x=>norm(x?.p?.name)==='refri 2l')||refriItems?.[0];
    if(!refri?.p)return toast('Refri 2L não encontrado na promoção.');
    const productId=String(refri.p.id);
    const gs=Number(window.BV_FLAVOR_STOCKS?.[productId+'::guarana']??0);
    const ls=Number(window.BV_FLAVOR_STOCKS?.[productId+'::laranja']??0);
    m.dataset.promotionId=String(promoId);
    m.dataset.promotionRefriQty=String(Math.max(1,Number(refri.q)||1));
    m.dataset.productId=productId;
    m.dataset.guaranaStock=String(gs);
    m.dataset.laranjaStock=String(ls);
    const box=m.querySelector('.bvFlavorOptions');
    if(box){
      box.innerHTML='';
      const addOption=(label,emoji,flavor,stock)=>{
        const b=document.createElement('button');
        b.type='button';
        b.disabled=stock<=0;
        b.innerHTML=emoji+' '+label+' <small>('+stock+' em estoque)</small>';
        b.addEventListener('click',()=>window.BV_SELECT_FLAVOR(flavor));
        box.appendChild(b);
      };
      addOption('Guaraná','🥤','Guaraná',gs);
      addOption('Laranja','🍊','Laranja',ls);
    }
    m.classList.add('show');
  };
  const saveCart=()=>{localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));const n=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;window.renderCart()};
  window.addToCart=id=>{const p=(window.products||[]).find(x=>String(x.id)===String(id));if(!p)return toast('Produto não encontrado.');if(norm(p.name)==='refri 2l'){window.BV_OPEN_FLAVOR_PICKER?.(p);return}const category=String(p.category||'Lanches');const isRefrigerante=category==='Bebidas'&&/coca|refri|refrigerante/i.test(String(p.name||''));const stock=Math.max(0,Number(p.stock)||0);if(isRefrigerante&&stock<=0)return toast('Este refrigerante está esgotado.');window.BV_ADD_PRODUCT_TO_CART?.(p,'')};
window.BV_ADD_PRODUCT_TO_CART=(p,flavor='')=>{
    if(!p)return;
    const category=String(p.category||'Lanches');
    const key=norm(flavor);
    const validFlavor=key==='guarana'?'Guaraná':key==='laranja'?'Laranja':'';
    const suffix=validFlavor?' — '+validFlavor:'';
    const cartId=validFlavor?String(p.id)+'::'+key:String(p.id);
    if(validFlavor){
      const stock=Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+key]??0));
      const existing=window.cart.find(x=>String(x.id)===cartId);
      if(stock<=0)return toast('Este sabor está esgotado.');
      if((Number(existing?.q)||0)>=stock)return toast('Quantidade máxima disponível para '+validFlavor+': '+stock+'.');
    }
    const item=window.cart.find(x=>String(x.id)===cartId);
    if(item)item.q=(Number(item.q)||0)+1;
    else window.cart.push({
      id:cartId,productId:p.id,name:String(p.name||'Refri 2L')+suffix,
      price:Number(p.price)||0,q:1,category,flavor:validFlavor
    });
    saveCart();
    window.renderCart?.();
    toast('Produto adicionado ao pedido.');
  };
  window.BV_OPEN_FLAVOR_PICKER=async p=>{
    if(!p)return;
    if(!Array.isArray(window.cart))window.cart=[];
    let productId=String(p.id);
    let stocks={guarana:0,laranja:0};
    try{
      if(!sb)throw new Error('Banco de dados indisponível.');
      // Resolve o ID diretamente no banco para não depender de produto/cache antigo.
      const pr=await sb.from('products').select('id,name').ilike('name','Refri 2L').limit(1).maybeSingle();
      if(pr.error)throw pr.error;
      if(pr.data?.id)productId=String(pr.data.id);
      const r=await sb.from('product_flavor_stock').select('flavor,stock').eq('product_id',productId);
      if(r.error)throw r.error;
      (r.data||[]).forEach(row=>{
        const k=norm(row.flavor);
        if(k==='guarana'||k==='laranja')stocks[k]=Math.max(0,Number(row.stock)||0);
      });
      window.BV_FLAVOR_STOCKS={
        ...(window.BV_FLAVOR_STOCKS||{}),
        [productId+'::guarana']:stocks.guarana,
        [productId+'::laranja']:stocks.laranja
      };
      // Mantém o produto usado no carrinho com o ID real do banco.
      p={...p,id:productId};
    }catch(e){
      console.error('[BV REFRI 2L PICKER]',e);
      const cached=window.BV_FLAVOR_STOCKS||{};
      stocks.guarana=Math.max(0,Number(cached[productId+'::guarana']??cached[String(p.id)+'::guarana']??0));
      stocks.laranja=Math.max(0,Number(cached[productId+'::laranja']??cached[String(p.id)+'::laranja']??0));
    }
    let m=$('bvFlavorModal');
    if(!m){
      m=document.createElement('div');
      m.id='bvFlavorModal';
      m.className='bvFlavorModal';
      m.innerHTML='<div class="bvFlavorBox"><button type="button" class="bvFlavorClose">×</button><small>ESCOLHA O SABOR</small><h3>Refri 2L</h3><p>Selecione o sabor:</p><div class="bvFlavorOptions"></div></div>';
      document.body.appendChild(m);
      m.querySelector('.bvFlavorClose')?.addEventListener('click',()=>window.BV_CLOSE_FLAVOR_PICKER());
      m.addEventListener('click',e=>{if(e.target===m)window.BV_CLOSE_FLAVOR_PICKER()});
    }
    m.dataset.productId=productId;
    m.dataset.guaranaStock=String(stocks.guarana);
    m.dataset.laranjaStock=String(stocks.laranja);
    const box=m.querySelector('.bvFlavorOptions');
    if(!box)return;
    box.innerHTML='';
    const addOption=(label,emoji,flavor,stock)=>{
      const b=document.createElement('button');
      b.type='button';
      b.disabled=stock<=0;
      b.innerHTML=emoji+' '+label+' <small>('+stock+' em estoque)</small>';
      b.addEventListener('click',()=>window.BV_SELECT_FLAVOR(flavor));
      box.appendChild(b);
    };
    addOption('Guaraná','🥤','Guaraná',stocks.guarana);
    addOption('Laranja','🍊','Laranja',stocks.laranja);
    m.classList.add('show');
  };
  window.BV_CLOSE_FLAVOR_PICKER=()=>{
    $('bvFlavorModal')?.classList.remove('show');
  };
  window.BV_SELECT_FLAVOR=async flavor=>{
    const m=$('bvFlavorModal');
    const id=m?.dataset.productId;
    if(!m||!id)return;
    const key=norm(flavor);
    if(!['guarana','laranja'].includes(key))return toast('Sabor inválido.');
    const stock=Math.max(0,Number(m.dataset[key+'Stock']||0));
    if(stock<=0)return toast('Este sabor está esgotado.');
    if(m.dataset.promotionId){const promoId=String(m.dataset.promotionId);const qty=Number(m.dataset.promotionRefriQty)||1;const flavorKey=key;const flavorCacheKey=String(m.dataset.productId)+'::'+flavorKey;const stock=Math.max(0,Number(m.dataset[flavorKey==='guarana'?'guaranaStock':'laranjaStock']||0));if(stock<qty)return toast('Estoque insuficiente para este sabor. Disponível: '+stock+'.');const promo=(window.promotions||[]).find(x=>String(x.id)===promoId);const rows=window.promotionItems?.[promoId]|| (promo?.product_id?[{product_id:promo.product_id,quantity:1}]:[]);const ps=window.products||[];const resolved=rows.map(i=>({p:ps.find(p=>String(p.id)===String(i.product_id)),q:Math.max(1,Number(i.quantity)||1)}));const refri=resolved.find(x=>norm(x.p?.name)==='refri 2l');if(!promo||!refri)return toast('Promoção não encontrada.');const cartKey='promo:'+promoId;const existing=window.cart.find(x=>x.id===cartKey);if(existing){const nextQ=(Number(existing.q)||0)+1;if(stock<qty*nextQ)return toast('Estoque insuficiente para adicionar outra promoção. Disponível: '+stock+'.');existing.q=nextQ;existing.promotionFlavors=[{productId:refri.p.id,flavor:flavorKey==='guarana'?'Guaraná':'Laranja',quantity:refri.q}];}else window.cart.push({id:cartKey,name:'🎁 '+promo.name,price:Number(promo.promotional_price)||0,q:1,isPromotion:true,promotionId:promoId,promotionItems:resolved.map(x=>({id:x.p.id,name:x.p.name,quantity:x.q})),promotionFlavors:[{productId:refri.p.id,flavor:flavorKey==='guarana'?'Guaraná':'Laranja',quantity:refri.q}]});m.dataset.promotionId='';m.dataset.promotionRefriQty='';window.BV_CLOSE_FLAVOR_PICKER();saveCart();toast('Promoção adicionada ao pedido por '+money(promo.promotional_price)+'.');showPage('pedido');return;}
  const p0=(window.products||[]).find(x=>norm(x?.name)==='refri 2l');
    if(!p0)return toast('Produto Refri 2L não encontrado.');
    const p={...p0,id:String(id),name:'Refri 2L'};
    if(!Array.isArray(window.cart))window.cart=[];
    const cartId=String(id)+'::'+key;
    const existing=window.cart.find(x=>String(x.id)===cartId);
    if((Number(existing?.q)||0)>=stock)return toast('Quantidade máxima disponível: '+stock+'.');
    window.BV_CLOSE_FLAVOR_PICKER();
    window.BV_ADD_PRODUCT_TO_CART(p,key==='guarana'?'Guaraná':'Laranja');
  };
  window.change=async(id,d)=>{const r=window.cart.find(x=>String(x.id)===String(id));if(!r)return;const baseId=r.productId||String(r.id).split('::')[0];const p=(window.products||[]).find(x=>String(x.id)===String(baseId));const category=r.category||p?.category||'Lanches';const isRefri2L=norm(p?.name)==='refri 2l';const isRefrigerante=category==='Bebidas'&&/coca|refri|refrigerante/i.test(String(r.name||p?.name||''));if(isRefri2L&&Number(d)>0){await window.BV_REFRESH_FLAVOR_STOCKS?.();const flavorKey=norm(r.flavor);if(!['guarana','laranja'].includes(flavorKey))return toast('Selecione o sabor novamente.');const stock=Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+flavorKey]??0));if(Number(r.q||0)>=stock)return toast('Quantidade máxima disponível para '+(flavorKey==='guarana'?'Guaraná':'Laranja')+': '+stock+'.');}else if(Number(d)>0&&isRefrigerante){const stock=Math.max(0,Number(p?.stock)||0);if(stock<=Number(r.q||0))return toast('Quantidade máxima disponível em estoque: '+stock+'.');}r.q=(Number(r.q)||0)+Number(d||0);if(r.q<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.removeFromCart=id=>{window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.renderCart=()=>{
    const b=$('cart');if(!b)return;
    const c=window.cart||[],sub=c.reduce((s,x)=>s+(Number(x.price)||0)*(Number(x.q)||0),0),fee=Number($('fee')?.dataset.value||0);
    b.innerHTML=c.length?c.map(x=>{const p=(window.products||[]).find(y=>String(y.id)===String(x.productId||String(x.id).split('::')[0]));const category=String(x.category||p?.category||'Lanches');const categoryLabel=category==='Adicionais'?'ADICIONAIS':category==='Bebidas'?'BEBIDAS':'ITEM';if(x.isPromotion){const promoItems=Array.isArray(x.promotionItems)?x.promotionItems:[];const promoFlavors=Array.isArray(x.promotionFlavors)?x.promotionFlavors:[];const childRows=promoItems.map(item=>{const flavor=promoFlavors.find(v=>String(v.productId)===String(item.id));const flavorText=flavor?.flavor?' — '+flavor.flavor:'';const qty=Math.max(1,Number(item.quantity)||1)*(Math.max(1,Number(x.q)||1));return '<div class="cartPromoItem"><span>🍔</span><div><b>'+esc(item.name)+flavorText+'</b><small>'+qty+'x</small></div></div>'}).join('');return '<div class="cartRow cartPromotionRow"><div class="cartInfo"><small class="cartCategoryLabel">🏷️ PROMOÇÃO</small><b>'+esc(x.name)+'</b><div class="cartPromotionItems">'+childRows+'</div><small class="cartPromotionPrice">'+money(x.price)+' cada promoção</small></div><div class="cartQty"><button type="button" onclick="change(\''+esc(x.id)+'\',-1)">−</button><strong>'+Number(x.q||0)+'</strong><button type="button" onclick="change(\''+esc(x.id)+'\',1)">+</button><button type="button" class="remove" onclick="removeFromCart(\''+esc(x.id)+'\')">×</button></div></div>';}return '<div class="cartRow"><div class="cartInfo"><small class="cartCategoryLabel">'+categoryLabel+'</small><b>'+esc(x.name)+'</b><small>'+money(x.price)+' cada</small></div><div class="cartQty"><button type="button" onclick="change(\''+esc(x.id)+'\',-1)">−</button><strong>'+Number(x.q||0)+'</strong><button type="button" onclick="change(\''+esc(x.id)+'\',1)">+</button><button type="button" class="remove" onclick="removeFromCart(\''+esc(x.id)+'\')">×</button></div></div>'}).join(''):'<div class="emptyCart"><span>🛒</span><b>Seu carrinho está vazio</b><small>Escolha seus lanches no cardápio.</small><button type="button" onclick="showPage(\'cardapio\')">Ver cardápio</button></div>';
    if($('sub'))$('sub').textContent=money(sub);if($('fee'))$('fee').textContent=money(fee);if($('total'))$('total').textContent=money(sub+fee);
    const n=c.reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;
  };
  window.mode=(m,b)=>{document.querySelectorAll('#page-pedido .tabs button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_MODE=m;$('address')&&($('address').style.display=m==='entrega'?'block':'none');window.refreshNeighborhoodFee()};
  window.pay=(p,b)=>{
    const label=String(p||'Pix');
    window.BV_PAYMENT=label;
    localStorage.setItem('bv_payment',label);
    document.querySelectorAll('#page-pedido .pay button').forEach(x=>x.classList.toggle('active',x===b));
    $('troco')?.classList.toggle('hide',label!=='Dinheiro');
  };
  window.initPaymentSelection=()=>{
    // Estado do pagamento fica sincronizado com o botão visível.
    // Evita reaproveitar acidentalmente um método antigo do navegador.
    const current=String(window.BV_PAYMENT||'').toLowerCase();
    if(current!=='pix'&&current!=='dinheiro'&&current!=='cartão'&&current!=='cartao'){
      window.BV_PAYMENT='Pix';
    }
    const buttons=[...document.querySelectorAll('#page-pedido .pay button')];
    if(!buttons.length)return;
    const active=buttons.find(x=>x.classList.contains('active'));
    if(active){
      const t=String(active.textContent||'').toLowerCase();
      const label=t.includes('dinheiro')?'Dinheiro':t.includes('cart')?'Cartão':'Pix';
      window.BV_PAYMENT=label;
      localStorage.setItem('bv_payment',label);
      $('troco')?.classList.toggle('hide',label!=='Dinheiro');
    }else{
      window.pay('Pix',buttons[0]);
    }
  };

  let bvFeeTimer=null;
  window.refreshNeighborhoodFeeSoon=()=>{
    clearTimeout(bvFeeTimer);
    bvFeeTimer=setTimeout(()=>window.refreshNeighborhoodFee?.(),60);
  };
  window.refreshNeighborhoodFee=async()=>{
    const f=$('fee');if(!f)return;
    if(window.BV_MODE==='retirada'){f.dataset.value='0';f.textContent=money(0);window.renderCart();return}
    let v=Number(window.BV_DEFAULT_FEE||0);
    if(sb){try{const r=await sb.from('neighborhood_fees').select('name,fee').eq('active',true);if(!r.error){const hit=(r.data||[]).find(x=>norm(x.name)===norm($('bairro')?.value||''));if(hit)v=Number(hit.fee)||0}}catch{}}
    f.dataset.value=String(v);f.textContent=money(v);window.renderCart();
  };
  window.BV_OPEN_PRODUCT_FORM=()=>{
    const panel=$('productFormPanel');
    if(!panel)return toast('Formulário de produto não encontrado. Recarregue a página.');
    panel.classList.add('show','open');
    panel.style.setProperty('display','block','important');
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
    setTimeout(()=>{$('productName')?.focus({preventScroll:true})},180);
  };
  window.openProductForm=window.BV_OPEN_PRODUCT_FORM;
  window.BV_CLOSE_PRODUCT_FORM=()=>{
    const panel=$('productFormPanel');
    if(!panel)return;
    panel.classList.remove('show','open');
    panel.style.removeProperty('display');
  };
  window.closeProductForm=window.BV_CLOSE_PRODUCT_FORM;

  window.login=async()=>{
    const err=$('err');
    if(err)err.textContent='';
    const email=String($('email')?.value||'').trim().toLowerCase();
    const pass=String($('pass')?.value||'');
    if(!email||!pass){if(err)err.textContent='Informe e-mail e senha.';return;}
    const btn=document.querySelector('#login button:not(.registerLoginBtn)');
    const oldText=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Entrando...';}
    try{
      // A autenticação oficial fica centralizada em bv-auth-v2.js.
      // Esta camada não deve sobrescrever o fluxo nem criar uma segunda sessão.
      if(typeof window.BV_LOGIN==='function'){
        const r=await window.BV_LOGIN(email,pass);
        if(r?.error){if(err)err.textContent=r.error;return;}
      }else{
        if(!sb)throw new Error('Conexão com o banco indisponível. Recarregue a página.');
        const r=await sb.auth.signInWithPassword({email,password:pass});
        if(r.error)throw r.error;
        localStorage.setItem('bv_first_login_done','1');
      }
      if(err)err.textContent='';
      $('login')?.style.setProperty('display','none','important');
    }catch(e){
      console.error('[BV LOGIN]',e);
      if(err)err.textContent=String(e?.message||'Não foi possível entrar. Tente novamente.');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=oldText||'Entrar';}
    }
  };
  window.registerUser=async e=>{
    e.preventDefault();$('registerErr')&&($('registerErr').textContent='');
    const n=$('registerName')?.value.trim(),em=$('registerEmail')?.value.trim(),pw=$('registerPass')?.value||'',pw2=$('registerPass2')?.value||'';
    if(pw!==pw2)return $('registerErr').textContent='As senhas não conferem.';
    if(!sb)return $('registerErr').textContent='Conexão indisponível.';
    const r=await sb.auth.signUp({email:em,password:pw});
    if(r.error)return $('registerErr').textContent=r.error.message;
    if(r.data.user){const z=await sb.from('profiles').upsert({id:r.data.user.id,name:n,role:'usuario'},{onConflict:'id'});if(z.error)return $('registerErr').textContent=z.error.message}
    window.closeRegister();toast(r.data.session?'Conta criada com sucesso.':'Conta criada. Confirme o e-mail se o sistema solicitar.');
  };
  window.logout=async()=>{if(sb)await sb.auth.signOut();window.BV_ROLE='';window.BV_USER_NAME='';clearSavedPage();window.applyAccess();$('login')&&($('login').style.display='flex');window.showPage('inicio',true)};

  window.loadProfile=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
    const r=await sb.from('profiles').select('name,phone,street,number,neighborhood,cep,complement').eq('id',user.id).maybeSingle();const d=r.data;if(!d)return;
    [['name',d.name],['phone',d.phone],['street',d.street],['num',d.number],['bairro',d.neighborhood],['cep',d.cep],['comp',d.complement]].forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v||''});
    window.refreshNeighborhoodFeeSoon();
  };
  ['bairro','street','num','cep'].forEach(id=>{
    const el=$(id); if(!el)return;
    ['input','change','paste','blur'].forEach(ev=>el.addEventListener(ev,()=>window.refreshNeighborhoodFeeSoon()));
  });
  const saveProfile=async()=>{if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('profiles').update({name:$('name')?.value.trim()||'',phone:$('phone')?.value.trim()||'',street:$('street')?.value.trim()||'',number:$('num')?.value.trim()||'',neighborhood:$('bairro')?.value.trim()||'',cep:$('cep')?.value.trim()||'',complement:$('comp')?.value.trim()||''}).eq('id',user.id)};


  window.orderItemsMarkup=items=>{let rows=[];const normalizeItem=i=>{if(i==null)return null;if(typeof i==='string'||typeof i==='number'){const m=String(i).match(/^([0-9]+)x\\s*(.+)$/i);return{name:String(m?m[2]:i).trim(),quantity:Math.max(1,Number(m?m[1]:1)||1)}}if(typeof i==='object'){const name=i.product_name??i.productName??i.name??i.title??i.description??i.label;const nested=i.product??i.item??i.data;if(name!=null&&typeof name!=='object')return{product_id:i.product_id||i.productId||'',name:String(name),quantity:Math.max(1,Number(i.quantity??i.qty??i.q??1)||1)};if(nested&&nested!==i)return normalizeItem(nested)}return null};if(Array.isArray(items)){rows=items.map(normalizeItem).filter(Boolean)}else if(items&&typeof items==='object'){const candidate=items.items??items.order_items??items.products??items.data;if(Array.isArray(candidate))rows=candidate.map(normalizeItem).filter(Boolean);else{const one=normalizeItem(items);if(one)rows=[one]}}else{const raw=String(items??'').trim();if(raw){rows=raw.split(/\\s*(?:•|,|\\n)\\s*/).map(normalizeItem).filter(Boolean)}}const groups={Lanches:[],Bebidas:[],Adicionais:[]};rows.forEach(i=>{const name=i.name||'Produto';const baseName=name.split(' — ')[0].trim();const p=(window.products||[]).find(x=>(i.product_id&&String(x.id)===String(i.product_id))||norm(x?.name)===norm(baseName));const cat=String(p?.category||'').trim().toLowerCase();const key=cat==='bebidas'?'Bebidas':cat==='adicionais'?'Adicionais':'Lanches';groups[key].push(i.quantity+'x '+name)});return ['Lanches','Bebidas','Adicionais'].filter(k=>groups[k].length).map(k=>'<div class="bvOrderItemGroup"><small>'+k.toUpperCase()+'</small><p>'+esc(groups[k].join(' • '))+'</p></div>').join('')||'<div class="bvOrderItemGroup"><small>LANCHES</small><p>Itens do pedido</p></div>'};
  window.orderLabel=o=>Number(o?.orderNumber)>0?String(Math.trunc(o.orderNumber)).padStart(3,'0'):String(o?.id||'').slice(-5);
  window.renderAdmin=()=>{
    const b=$('orders');if(!b)return;
    if((!Array.isArray(window.orders)||window.orders.length===0)&&typeof window.BV_REFRESH_ORDERS==='function'&&!window.BV_ADMIN_REFRESHING){
      window.BV_ADMIN_REFRESHING=true;Promise.resolve(window.BV_REFRESH_ORDERS()).finally(()=>{window.BV_ADMIN_REFRESHING=false;});return;
    }
    const q=norm($('orderSearch')?.value||''),sf=$('orderStatusFilter')?.value||'',pf=$('orderPaymentFilter')?.value||'',df=$('orderDateFilter')?.value||'',now=Date.now();
    const filtered=(window.orders||[]).filter(o=>{
      const raw=String(o.rawStatus||'').trim().toLowerCase();
      if(['entregue','cancelado'].includes(raw))return false;
      const text=norm([o.customer,o.phone,o.address?.rua,o.address?.bairro,window.orderLabel(o),o.id].join(' '));
      if(q&&!text.includes(q))return false;if(sf&&raw!==String(sf).toLowerCase())return false;if(pf&&o.payment!==pf)return false;
      if(df){const t=new Date(o.created_at).getTime();if(df==='today'){const d=new Date();d.setHours(0,0,0,0);if(t<d.getTime())return false}else if(now-t>Number(df)*86400000)return false}
      return true;
    });
    const productionRows=filtered.filter(o=>['recebido','em_preparo'].includes(String(o.rawStatus||'').trim().toLowerCase()));
    const card=o=>{
      const raw=String(o.rawStatus||'').trim().toLowerCase(),isNew=raw==='recebido',pm=String(o.payment||'').toLowerCase();
      const paymentBadge=pm.includes('dinheiro')?'💵 Dinheiro'+(Number(o.changeFor)>0?' · Troco para '+money(o.changeFor):''):pm.includes('cart')?'💳 Cartão':pm.includes('pix')?'🟦 PIX':'';
      const created=o.created_at?new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
      const address=[o.address?.rua,o.address?.numero,o.address?.bairro].filter(Boolean).join(' · ');
      const action=isNew?'<button type="button" class="bvStartOrderBtn" onclick="statusOrder(\''+esc(o.id)+'\',\'em_preparo\')">▶ INICIAR PREPARO</button>':'<button type="button" class="bvStartOrderBtn bvReadyOrderBtn" onclick="statusOrder(\''+esc(o.id)+'\',\'em_producao\')">✓ PEDIDO PRONTO</button>';
      return '<article class="orderCard bvProductionOrderCard '+(isNew?'bvNewOrderCard':'')+'">'+(isNew?'<div class="bvNewOrderRibbon">🔔 NOVO PEDIDO</div>':'')+
        '<div class="orderHead"><div><small>PEDIDO</small><b>#'+esc(window.orderLabel(o))+'</b><small class="bvProductionTime">Recebido às '+esc(created)+'</small></div><span class="statusBadge '+(isNew?'bvNewStatusBadge':'')+'">'+(isNew?'NOVO PEDIDO':'EM PREPARO')+'</span></div>'+
        '<div class="orderBody"><div class="bvOrderCustomer"><b>'+esc(o.customer||'Cliente')+'</b><span>'+esc(o.phone||'Telefone não informado')+'</span></div>'+
        '<div class="bvOrderItems">'+window.orderItemsMarkup(o.items)+'</div><div class="bvProductionAddress"><div class="bvDeliveryTitle">📍 ENTREGA</div><b>'+esc(address||'Endereço não informado')+'</b></div>'+
        (paymentBadge?'<div class="orderPaymentBadge">'+paymentBadge+'</div>':'')+((raw==='em_preparo'&&String(o.deliveryRefusedReason||'').trim())?'<div class="bvDeliveryRefusalReason"><div>↩️ ENTREGA RECUSADA</div><p><b>Motivo:</b> '+esc(o.deliveryRefusedReason)+'</p></div>':'')+'</div>'+
        '<div class="orderFoot"><div><small>TOTAL</small><strong>'+money(o.total)+'</strong></div><div class="bvOrderActions">'+action+'<button type="button" class="bvCancelOrderBtn" onclick="cancelOrder(\''+esc(o.id)+'\')">Cancelar pedido</button></div></div></article>';
    };
    const newRows=productionRows.filter(o=>String(o.rawStatus||'').toLowerCase()==='recebido'),prepRows=productionRows.filter(o=>String(o.rawStatus||'').toLowerCase()==='em_preparo');
    const section=(title,sub,rows,cls)=>{
      return '<section class="bvProductionSection '+cls+'"><div class="bvProductionSectionHead"><div><span>'+title+'</span><small>'+sub+'</small></div><strong>'+rows.length+'</strong></div>'+
        (rows.length?'<div class="bvProductionGrid">'+rows.map(card).join('')+'</div>':'<div class="emptyState"><small>Nenhum pedido nesta etapa.</small></div>')+'</section>';
    };
    b.innerHTML=section('🔔 NOVOS PEDIDOS','Pedidos aguardando início do preparo.',newRows,'bvNewOrdersSection')+
      section('🍳 EM PREPARO','Pedidos que já estão sendo preparados.',prepRows,'bvPreparingOrdersSection');
  };
  window.cancelOrder=async(id)=>{
    if(!sb||!window.admin())return toast('Acesso restrito ao administrador.');
    const o=(window.orders||[]).find(x=>String(x.id)===String(id));
    if(!o)return toast('Pedido não encontrado. Atualize a lista e tente novamente.');
    if(String(o.rawStatus||'').toLowerCase()==='cancelado')return toast('Este pedido já está cancelado.');
    if(!await window.BV_CONFIRM_CANCEL_ORDER?.(o))return;
    const r=await sb.rpc('cancel_bv_order',{p_order_id:id});
    if(r.error)return toast('Não foi possível cancelar o pedido: '+r.error.message);
    window.orders=(window.orders||[]).filter(x=>String(x.id)!==String(id));
    window.renderAdmin?.();
    toast('Pedido cancelado.');
  };
  window.statusOrder=async(id,s)=>{
    if(!sb||!window.admin())return toast('Acesso restrito ao administrador.');
    s=String(s||'').trim().toLowerCase();
    if(!['em_preparo','em_producao'].includes(s))return toast('Status inválido para esta etapa.');
    const o=(window.orders||[]).find(x=>String(x.id)===String(id));
    if(!o)return toast('Pedido não encontrado. Atualize a lista e tente novamente.');
    const current=String(o.rawStatus||'').toLowerCase();
    if(s==='em_preparo'&&current!=='recebido')return toast('Somente pedidos novos podem ser iniciados.');
    if(s==='em_producao'&&current!=='em_preparo')return toast('Somente pedidos em preparo podem ser marcados como Pronto.');
    const r=await sb.from('orders').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return toast(r.error.message==='PIX_AGUARDANDO_PAGAMENTO'?'PIX ainda não foi pago.':('Erro ao atualizar status: '+r.error.message));
    await window.BV_REFRESH_ORDERS?.();
    window.renderAdmin?.();
    toast('Status atualizado.');
  };
  window.setDashboardDateFilter=value=>{window.BV_DASHBOARD_DATE=value||'';const input=$('dashboardDateFilter');if(input)input.value=window.BV_DASHBOARD_DATE;window.renderDashboard()};
  const formatDashboardItems=value=>{
    if(value==null||value==='')return 'Nenhum item informado';
    if(typeof value==='string')return value;
    const collect=src=>{
      if(src==null)return [];
      if(Array.isArray(src))return src.flatMap(collect);
      if(typeof src==='string'||typeof src==='number')return [src];
      if(typeof src==='object'){
        const nested=src.items||src.order_items||src.products||src.data;
        if(Array.isArray(nested))return nested.flatMap(collect);
        return [src];
      }
      return [];
    };
    return collect(value).map(item=>{
      if(item==null)return '';
      if(typeof item==='string'||typeof item==='number')return String(item);
      const product=item.product||item.item||item.data||{};
      const name=item.product_name||item.productName||item.name||item.title||item.description||product.product_name||product.name||product.title||'Item';
      const qty=Number(item.quantity??item.q??item.qty??1)||1;
      const extras=item.addons||item.adicionais||item.additions||item.flavors||item.sabores;
      let line=qty+'x '+String(name);
      if(Array.isArray(extras)&&extras.length)line+=' ('+extras.map(x=>typeof x==='object'?(x.name||x.product_name||x.productName||''):String(x)).filter(Boolean).join(', ')+')';
      return line;
    }).filter(Boolean).join(' • ')||'Nenhum item informado';
  };

  window.renderDashboard=()=>{
    const all=window.orders||[];
    const selected=window.BV_DASHBOARD_DATE||'';
    const localDateKey=o=>{const d=new Date(o?.created_at);if(Number.isNaN(d.getTime()))return '';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
    const byDate=o=>!selected||localDateKey(o)===selected;
    const filtered=all.filter(byDate);
    const done=all.filter(o=>o.rawStatus==='entregue'||o.status==='Entregue');
    const delivered=done.filter(byDate);
    const pending=filtered.filter(o=>!['Entregue','Cancelado'].includes(o.status));
    const purchaseTotal=o=>{const total=Number(o?.total)||0;const fee=Number(o?.deliveryFee ?? o?.delivery_fee)||0;return Math.max(0,total-fee)};
    const rev=delivered.reduce((s,o)=>s+purchaseTotal(o),0);
    if($('sOrders'))$('sOrders').textContent=delivered.length;
    if($('sRevenue'))$('sRevenue').textContent=money(rev);
    if($('sAvg'))$('sAvg').textContent=money(delivered.length?rev/delivered.length:0);
    if($('sNew'))$('sNew').textContent=pending.length;
    const chart=$('dashboardChart');
    if(chart){
      const statusMap=[
        ['recebido','Novo'],['em_preparo','Em preparo'],['em_producao','Pronto'],
        ['saiu_entrega','Saiu para entrega'],['entregue','Entregue'],['cancelado','Cancelado']
      ];
      const cs=statusMap.map(([raw])=>filtered.filter(o=>String(o.rawStatus||'')===raw).length);
      const mx=Math.max(1,...cs);
      chart.innerHTML=statusMap.map(([raw,label],i)=>'<div class="chartBar"><div class="chartTrack"><div class="chartFill" style="height:'+Math.max(5,cs[i]/mx*100)+'%"></div></div><b>'+cs[i]+'</b><small>'+label+'</small></div>').join('');
      const title=chart.closest('.analyticsPanel')?.querySelector('.panelTitle small');
      if(title)title.textContent=selected?'Distribuição dos pedidos em '+selected.split('-').reverse().join('/'):'Distribuição dos pedidos por status';
    }
    const nc=$('notificationCenter'),badge=$('notificationBadge'),homeBadge=$('homeNotificationBadge');
    if(badge)badge.textContent=pending.length;
    if(homeBadge)homeBadge.textContent=pending.length;
    if(nc)nc.innerHTML=pending.slice(0,10).map(o=>'<div class="notificationItem"><b>Pedido #'+esc(window.orderLabel(o))+'</b><small>'+esc(o.customer||'Cliente')+' · '+esc(o.status)+'</small></div>').join('')||'<div class="notificationItem">Nenhuma pendência.</div>';
    const list=$('dashboardOrders');
    if(list){
      const fmtDate=o=>{const d=new Date(o.created_at);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' · '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
      list.innerHTML=delivered.length?delivered.slice(0,20).map((o,i)=>'<div class="line dashboardOrderLine"><span class="dashboardOrderMain"><b>Pedido #'+esc(window.orderLabel(o))+' · '+esc(o.customer||'Cliente')+'</b><small>'+esc(formatDashboardItems(o.items))+'</small><small class="dashboardOrderDate">📅 <strong>'+esc(fmtDate(o))+'</strong></small></span><strong class="dashboardOrderValue">'+money(purchaseTotal(o))+'</strong><button type="button" class="dashboardOrderDetailsBtn" data-dashboard-order-index="'+i+'">Ver detalhes</button></div>').join(''):'<div class="emptyState"><span>📋</span><b>Nenhum pedido entregue'+(selected?' nesta data':' ainda')+'</b><small>'+(selected?'Escolha outra data ou clique em Todos.':'Os pedidos entregues aparecerão aqui.')+'</small></div>';
      list.querySelectorAll('.dashboardOrderDetailsBtn').forEach(btn=>{btn.addEventListener('click',()=>{const i=Number(btn.dataset.dashboardOrderIndex);const o=delivered.slice(0,20)[i];if(o)window.showDashboardOrderDetails(o)})});
    }
  };
  window.showDashboardOrderDetails=o=>{
    if(!o)return;
    const purchaseTotal=o=>Math.max(0,(Number(o?.total)||0)-(Number(o?.deliveryFee ?? o?.delivery_fee)||0));
    const deliveryFee=Number(o?.deliveryFee ?? o?.delivery_fee)||0;
    const orderTotal=purchaseTotal(o)+deliveryFee;
    let m=$('dashboardOrderDetails');
    if(!m){m=document.createElement('div');m.id='dashboardOrderDetails';m.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px)';document.body.appendChild(m)}
    const d=new Date(o.created_at);const date=Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const address=o.address?((o.address.rua||'')+(o.address.bairro?' — '+o.address.bairro:'')):'Retirada no local';
    m.innerHTML='<div style="width:min(620px,100%);max-height:90vh;overflow:auto;background:#111419;color:#fff;border:1px solid #343a44;border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.7);padding:22px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px"><div><small style="color:#e50914;font-weight:900;letter-spacing:1px">DETALHES DO PEDIDO</small><h2 style="margin:6px 0">#'+esc(window.orderLabel(o))+'</h2></div><button type="button" onclick="closeDashboardOrderDetails()" style="width:40px;height:40px;border:1px solid #343a44;border-radius:10px;background:#20242a;color:#fff;font-size:24px;cursor:pointer">×</button></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px"><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>CLIENTE</small><br><b>'+esc(o.customer||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>STATUS</small><br><b>'+esc(o.status||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>WHATSAPP</small><br><b>'+esc(o.phone||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>DATA E HORA</small><br><b>'+esc(date)+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>PAGAMENTO</small><br><b>'+esc(o.payment||'Não informado')+'</b></div></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ENDEREÇO</small><p style="margin:6px 0 0">'+esc(address)+'</p></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ITENS DO PEDIDO</small><p style="margin:6px 0 0;line-height:1.7">'+esc(formatDashboardItems(o.items))+'</p></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:15px;border-top:1px solid #343a44"><span style="font-weight:800">TOTAL DO PEDIDO (COM TAXA)</span><strong style="font-size:24px;color:#e50914">'+money(orderTotal)+'</strong></div></div>';
  };
  window.closeDashboardOrderDetails=()=>{$('dashboardOrderDetails')?.remove()};
  window.toggleNotifications=()=>{$('notificationCenter')?.classList.toggle('show');$('notificationCenter')?.classList.toggle('open')};
  window.clearOrderFilters=()=>{['orderSearch','orderStatusFilter','orderPaymentFilter','orderDateFilter'].forEach(id=>{if($(id))$(id).value=''});window.renderAdmin()};
  ['orderSearch','orderStatusFilter','orderPaymentFilter','orderDateFilter'].forEach(id=>$(id)?.addEventListener('input',window.renderAdmin));

  window.refreshDeliveryFees=async()=>{
    const b=$('bairroFees');if(!b||!sb)return;const r=await sb.from('neighborhood_fees').select('*').order('name');if(r.error)return b.innerHTML='<p class="muted">Erro ao carregar taxas: '+esc(r.error.message)+'</p>';
    b.innerHTML=(r.data||[]).map(x=>`<div class="feeRow"><div><b>${esc(x.name)}</b><small> ${money(x.fee)}</small></div><div class="feeActions"><button type="button" onclick="updateBairroFee('${esc(x.name)}')">Editar</button><button type="button" onclick="deleteBairroFee('${esc(x.name)}')">Excluir</button></div></div>`).join('')||'<p class="muted">Nenhum bairro cadastrado.</p>';
  };
  window.addBairroFee=async()=>{
    if(!sb)return;const n=$('bairroCfg')?.value.trim(),f=Number(String($('bairroFeeCfg')?.value||'').replace(',','.'));if(!n||!Number.isFinite(f)||f<0)return toast('Informe bairro e uma taxa válida.');
    const r=await sb.from('neighborhood_fees').upsert({name:n,fee:f,active:true},{onConflict:'name'});if(r.error)return toast('Erro ao salvar taxa: '+r.error.message);$('bairroCfg').value='';$('bairroFeeCfg').value='';await window.refreshDeliveryFees();toast('Taxa salva.');
  };
  window.updateBairroFee=async n=>{const v=prompt('Nova taxa para '+n);if(v===null)return;const f=Number(String(v).replace(',','.'));if(!Number.isFinite(f)||f<0)return toast('Taxa inválida.');const r=await sb.from('neighborhood_fees').update({fee:f,active:true}).eq('name',n);if(r.error)return toast('Erro: '+r.error.message);await window.refreshDeliveryFees();toast('Taxa atualizada.')};
  window.deleteBairroFee=async n=>{if(!confirm('Excluir a taxa de '+n+'?'))return;const r=await sb.from('neighborhood_fees').delete().eq('name',n);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.refreshDeliveryFees();toast('Bairro excluído.')};
  window.BV_STORE_OPEN=true;
window.renderStoreStatus=async function(){
  const open=window.BV_STORE_OPEN!==false;
  const wrap=document.getElementById('storeStatusControl'),label=document.getElementById('storeStatusLabel'),btn=document.getElementById('storeStatusBtn');
  if(wrap&&label&&btn){
    wrap.classList.toggle('open',open);wrap.classList.toggle('closed',!open);
    label.textContent=open?'🟢 Loja aberta':'🔴 Loja fechada';
    btn.textContent=open?'Fechar loja':'Abrir loja';
  }
  const topStore=document.querySelector('.adminState');if(topStore)topStore.textContent=open?'Loja aberta':'Loja fechada';
  const homeCard=document.querySelector('.storeStatusHomeCard');
  const homeIcon=document.getElementById('homeStoreStatusIcon');
  const homeText=document.getElementById('homeStoreStatusText');
  if(homeCard&&homeIcon&&homeText){
    homeCard.classList.toggle('open',open);homeCard.classList.toggle('closed',!open);
    homeIcon.textContent=open?'🟢':'🔴';
    homeText.textContent=open?'A loja está aberta e recebendo pedidos.':'A loja está fechada no momento.';
  }
};
window.toggleStoreStatus=async function(){
  if(!sb)return toast('Sistema ainda carregando. Tente novamente.');
  const btn=document.getElementById('storeStatusBtn');
  if(btn)btn.disabled=true;
  const previous=window.BV_STORE_OPEN!==false;
  const next=!previous;
  try{
    const r=await sb.from('settings').update({store_open:next}).eq('id',1).select('store_open').maybeSingle();
    if(r.error)throw r.error;
    if(!r.data)throw new Error('Configuração da loja não encontrada.');
    window.BV_STORE_OPEN=r.data.store_open!==false;
    window.renderStoreStatus?.();
    toast(window.BV_STORE_OPEN?'Loja aberta.':'Loja fechada.');
  }catch(e){
    window.BV_STORE_OPEN=previous;
    window.renderStoreStatus?.();
    toast('Não foi possível alterar a loja: '+(e?.message||'erro ao salvar.'));
    console.error('[BV STORE STATUS]',e);
  }finally{
    if(btn)btn.disabled=false;
  }
};
window.saveCfg=async()=>{if(!sb)return;const f=Number(String($('feeCfg')?.value||0).replace(',','.')),w=$('waCfg')?.value.trim()||'';if(!Number.isFinite(f)||f<0)return toast('Taxa padrão inválida.');const r=await sb.from('settings').upsert({id:1,fee:f,whatsapp:w},{onConflict:'id'});if(r.error)return toast('Erro ao salvar configurações: '+r.error.message);window.BV_DEFAULT_FEE=f;toast('Configurações salvas.')};

  window.promotions=[];window.promotionItems={};
  window.BV_REFRESH_PROMOTIONS=async()=>{if(!sb)return;const r=await sb.from('promotions').select('*').order('created_at',{ascending:false});if(r.error)return toast('Erro ao carregar promoções: '+r.error.message);window.promotions=r.data||[];const ids=window.promotions.map(x=>x.id);window.promotionItems={};if(ids.length){const z=await sb.from('promotion_items').select('promotion_id,product_id,quantity').in('promotion_id',ids);if(!z.error)(z.data||[]).forEach(i=>{(window.promotionItems[i.promotion_id]??=[]).push(i)})}
    const productIds=[...new Set(Object.values(window.promotionItems).flat().map(i=>i.product_id).filter(Boolean).concat(window.promotions.map(x=>x.product_id).filter(Boolean)))];
    if(productIds.length){const pr=await sb.from('products').select('id,name,stock,active,category').in('id',productIds);if(!pr.error){const stockById={};(pr.data||[]).forEach(p=>stockById[String(p.id)]=Number(p.stock)||0);const flavorIds=(pr.data||[]).filter(p=>norm(p.name)==='refri 2l').map(p=>String(p.id));let flavorStockById={};if(flavorIds.length){const fr=await sb.from('product_flavor_stock').select('product_id,flavor,stock').in('product_id',flavorIds);if(!fr.error)(fr.data||[]).forEach(x=>{const k=norm(x.flavor);if(k==='guarana'||k==='laranja')flavorStockById[String(x.product_id)+'::'+k]=(Number(flavorStockById[String(x.product_id)+'::'+k])||0)+(Number(x.stock)||0)})}const disableIds=[];window.promotions.forEach(p=>{if(!p.active)return;const rows=window.promotionItems[p.id]?.length?window.promotionItems[p.id]:(p.product_id?[{product_id:p.product_id,quantity:1}]:[]);if(rows.some(i=>{const prod=(pr.data||[]).find(x=>String(x.id)===String(i.product_id));const cat=norm(prod?.category||'');if(cat!=='bebidas')return false;if(norm(prod?.name)==='refri 2l')return ((flavorStockById[String(i.product_id)+'::guarana']||0)+(flavorStockById[String(i.product_id)+'::laranja']||0))<Math.max(1,Number(i.quantity)||1);return (stockById[String(i.product_id)]??0)<Math.max(1,Number(i.quantity)||1)}))disableIds.push(p.id)});if(disableIds.length){await Promise.all(disableIds.map(id=>sb.from('promotions').update({active:false}).eq('id',id)));window.promotions.forEach(p=>{if(disableIds.includes(p.id))p.active=false})}}}
    window.renderProducts();window.renderPromotionsAdmin?.();window.renderHomePromoBanner?.()};
  window.renderProducts=window.renderProducts;
  window.BV_PROMOTIONS_REALTIME=null;
  window.BV_PROMOTIONS_REFRESH_TIMER=null;
  window.setupPromotionsRealtime=()=>{
    if(!sb||window.BV_PROMOTIONS_REALTIME)return;
    const schedule=()=>{
      clearTimeout(window.BV_PROMOTIONS_REFRESH_TIMER);
      window.BV_PROMOTIONS_REFRESH_TIMER=setTimeout(async()=>{
        try{await window.BV_REFRESH_PROMOTIONS?.()}catch(e){console.warn('[BV PROMO REALTIME]',e)}
      },120);
    };
    window.BV_PROMOTIONS_REALTIME=sb.channel('bv-promotions-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'promotions'},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'promotion_items'},schedule)
      .subscribe(status=>console.log('[BV PROMOTIONS] Realtime:',status));
  };

  window.BV_OPEN_PROMOTION=async promotionId=>{
    try{
      showPage('cardapio');
      const btn=document.querySelector('#page-cardapio .menuCategoryTabs button[data-menu-category="Promocoes"]');
      await window.setMenuCategory?.('Promocoes',btn);
      const id=String(promotionId);
      const card=[...document.querySelectorAll('.promotionCatalogCard')].find(el=>String(el.dataset.promotionId)===id);
      if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('bvPromotionFocus');setTimeout(()=>card.classList.remove('bvPromotionFocus'),1800);}
    }catch(e){console.warn('[BV PROMO CLICK]',e);try{showPage('cardapio')}catch(_){} }
  };

  window.renderHomePromoBanner=()=>{
    const box=$('homePromoBanner'),track=$('homePromoTrack'),dots=$('homePromoDots');if(!box||!track||!dots)return;
    const now=Date.now(),active=(window.promotions||[]).filter(x=>x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));
    if(!active.length){box.classList.remove('show');track.innerHTML='';dots.innerHTML='';clearInterval(window.BV_PROMO_TIMER);return}
    const ps=(window.products||[]).filter(x=>x.active!==false);
    track.innerHTML=active.map(x=>{const items=window.promotionItems?.[x.id]||[],legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[];const groups={Lanches:[],Bebidas:[],Adicionais:[]};(items.length?items:legacy).forEach(it=>{const p=ps.find(y=>String(y.id)===String(it.product_id));const name=p?.name||'Produto';const cat=String(p?.category||'').trim().toLowerCase();const key=cat==='bebidas'?'Bebidas':cat==='adicionais'?'Adicionais':'Lanches';groups[key].push((it.quantity||1)+'x '+name)});const list=['Lanches','Bebidas','Adicionais'].filter(k=>groups[k].length).map(k=>'<div class="homePromoGroup"><small>'+k.toUpperCase()+'</small><span>'+esc(groups[k].join(' • '))+'</span></div>').join('');return '<article class="homePromoSlide" role="button" tabindex="0" onclick="BV_OPEN_PROMOTION(\''+esc(x.id)+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();BV_OPEN_PROMOTION(\''+esc(x.id)+'\')}"'+(x.image_url?' style="background-image:linear-gradient(90deg,rgba(8,8,10,.96) 0%,rgba(8,8,10,.72) 45%,rgba(8,8,10,.18) 100%),url(\''+esc(x.image_url)+'\');background-size:cover;background-position:center;"':'')+'><div class="homePromoCopy"><small class="homePromoKicker">🔥 OFERTA ESPECIAL</small><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'Aproveite enquanto durar!')+'</p><div class="homePromoItems">'+list+'</div></div><div class="homePromoPrice"><del>'+money(x.original_price||0)+'</del><strong>'+money(x.promotional_price||0)+'</strong><button type="button" onclick="showPage(\'cardapio\')">Ver oferta →</button></div></article>'}).join('');
    dots.innerHTML=active.map((_,i)=>'<i class="'+(i===0?'active':'')+'"></i>').join('');box.classList.add('show');let index=0;clearInterval(window.BV_PROMO_TIMER);track.style.transform='translateX(0)';if(active.length>1)window.BV_PROMO_TIMER=setInterval(()=>{index=(index+1)%active.length;track.style.transform='translateX(-'+index*100+'%)';dots.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('active',i===index))},5000);
  };
  window.generatePromotionImage=async promotionId=>{
    try{
      const promo=(window.promotions||[]).find(x=>String(x.id)===String(promotionId));
      if(!promo)throw new Error('Promoção não encontrada.');
      if(window.BV_REFRESH_PROMOTIONS)await window.BV_REFRESH_PROMOTIONS();

      const items=window.promotionItems?.[promo.id]||[];
      const ps=window.products||[];
      const rows=items.length?items:(promo.product_id?[{product_id:promo.product_id,quantity:1}]:[]);
      const base=rows.map(i=>({
        p:ps.find(x=>String(x.id)===String(i.product_id)),
        q:Math.max(1,Number(i.quantity)||1)
      })).filter(x=>x.p);
      if(!base.length)throw new Error('A promoção não possui produtos válidos.');

      toast('🖼️ Criando banner grátis com todos os itens juntos...');

      const loadImg=url=>new Promise(resolve=>{
        if(!url)return resolve(null);
        const im=new Image();
        im.crossOrigin='anonymous';
        im.onload=()=>resolve(im);
        im.onerror=()=>resolve(null);
        im.src=url;
      });

      const units=[];
      base.forEach(x=>{for(let i=0;i<x.q;i++)units.push(x.p)});
      const visible=units.slice(0,9);
      const imgs=await Promise.all(visible.map(p=>loadImg(p.image_url)));

      const c=document.createElement('canvas');
      c.width=1200;c.height=800;
      const ctx=c.getContext('2d');
      if(!ctx)throw new Error('Seu navegador não suporta criação de banners.');

      // Arte única, sem API e sem custo.
      const bg=ctx.createLinearGradient(0,0,1200,800);
      bg.addColorStop(0,'#120003');bg.addColorStop(.48,'#61070d');bg.addColorStop(1,'#07080a');
      ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);

      const glow=ctx.createRadialGradient(600,430,40,600,430,520);
      glow.addColorStop(0,'rgba(255,205,0,.20)');
      glow.addColorStop(.48,'rgba(229,9,20,.12)');
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,c.width,c.height);

      // Cabeçalho do banner.
      ctx.textAlign='center';
      ctx.fillStyle='#ffd400';ctx.font='900 27px Arial';
      ctx.fillText('BRASABOX',600,45);
      ctx.fillStyle='#fff';ctx.font='900 48px Arial';
      ctx.fillText('PROMOÇÃO IMPERDÍVEL',600,102);

      // Área única do combo: os produtos se sobrepõem e formam uma única composição.
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,.20)';
      ctx.beginPath();ctx.ellipse(600,485,500,120,0,0,Math.PI*2);ctx.fill();
      ctx.restore();

      const positions=[];
      const n=visible.length;
      if(n===1)positions.push([600,405,300]);
      else if(n===2)positions.push([505,405,300],[695,405,300]);
      else if(n===3)positions.push([600,355,300],[465,470,280],[735,470,280]);
      else{
        const cols=n<=4?2:3;
        const top=n<=4?2:Math.ceil(n/3);
        for(let i=0;i<n;i++){
          const row=Math.floor(i/cols),col=i%cols;
          const count=Math.min(cols,n-row*cols);
          const spacing=190;
          const x=600+(col-(count-1)/2)*spacing;
          const y=360+row*145;
          positions.push([x,y,n>=7?235:260]);
        }
      }

      const drawImageCover=(im,x,y,size)=>{
        const w=im.naturalWidth||im.width||1,h=im.naturalHeight||im.height||1;
        const ratio=Math.max(size/w,size/h);
        const dw=w*ratio,dh=h*ratio;
        ctx.save();
        ctx.translate(x-size/2,y-size/2);
        ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=22;ctx.shadowOffsetY=12;
        ctx.beginPath();ctx.roundRect(0,0,size,size,28);ctx.clip();
        ctx.drawImage(im,(size-dw)/2,(size-dh)/2,dw,dh);
        ctx.restore();
      };

      visible.forEach((p,i)=>{
        const [x,y,size]=positions[i]||[600,410,240];
        const im=imgs[i];
        if(im)drawImageCover(im,x,y,size);
        else{
          ctx.save();
          ctx.fillStyle='rgba(255,255,255,.08)';
          ctx.beginPath();ctx.arc(x,y,size*.32,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.font='900 54px Arial';
          ctx.textAlign='center';
          ctx.fillText(p.category==='Bebidas'?'🥤':'🍔',x,y+18);
          ctx.restore();
        }
      });

      // Identificação do combo uma única vez — sem cards separados.
      const comboText=base.map(x=>x.q+'x '+x.p.name).join(' + ');
      ctx.textAlign='center';
      ctx.fillStyle='#fff';ctx.font='900 25px Arial';
      ctx.fillText(comboText.slice(0,78),600,610);

      ctx.fillStyle='#ffd400';ctx.font='900 64px Arial';
      ctx.fillText(money(Number(promo.promotional_price)||0),600,690);

      ctx.fillStyle='#fff';ctx.font='900 22px Arial';
      ctx.fillText('PEÇA JÁ O SEU!  •  OFERTA ESPECIAL',600,742);

      const data=c.toDataURL('image/jpeg',.82);
      const upd=await sb.from('promotions').update({image_url:data}).eq('id',promo.id);
      if(upd.error)throw upd.error;

      promo.image_url=data;
      window.renderHomePromoBanner?.();
      window.renderPromotionsAdmin?.();
      toast('✅ Banner grátis criado com os itens em uma única composição.');
      return true;
    }catch(e){
      console.error('[BV FREE PROMO IMAGE]',e);
      toast('❌ '+(e?.message||'Não foi possível criar a imagem.'));
      return false;
    }
  };
  window.renderPromotionsAdmin=()=>{const ps=(window.products||[]).filter(x=>x.active!==false);const b=$('promotionsManage');if(!b)return;const a=window.promotions||[];const itemBox=$('promoItems');if(itemBox&&!itemBox.children.length)window.addPromoItemRow?.();b.innerHTML=a.length?a.map(x=>{const items=window.promotionItems?.[x.id]||[];const legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[];const list=(items.length?items:legacy).map(i=>{const p=ps.find(y=>String(y.id)===String(i.product_id));return (i.quantity||1)+'x '+esc(p?.name||'Produto')}).join(' + ');return '<article class="promotionAdminCard"><div class="promoAdminMain"><div class="promoAdminInfo"><span class="promoBadge">🔥 PROMOÇÃO</span><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'')+'</p><small>'+list+'</small></div></div><div class="promoAdminPrice"><del>'+money(x.original_price||0)+'</del><b>'+money(x.promotional_price||0)+'</b></div><div class="promoActions"><button type="button" onclick="window.generatePromotionImage(this.getAttribute(&quot;data-promotion-id&quot;))" data-promotion-id="'+esc(x.id)+'">🤖 '+(x.image_url?'Atualizar banner':'Gerar banner')+'</button><button type="button" data-promotion-id="'+esc(x.id)+'" onclick="togglePromotion(this.getAttribute(&quot;data-promotion-id&quot;),'+(!x.active)+')">'+(x.active?'Desativar':'Ativar')+'</button><button type="button" data-promotion-id="'+esc(x.id)+'" onclick="removePromotion(this.getAttribute(&quot;data-promotion-id&quot;))">Excluir</button></div></article>'}).join(''):'<div class="emptyState"><span>🏷️</span><b>Nenhuma promoção cadastrada.</b><small>Cadastre a primeira oferta abaixo.</small></div>'};
  window.addPromotion=async e=>{e.preventDefault();const n=$('promoName')?.value.trim(),d=$('promoDesc')?.value.trim(),pp=Number($('promoPrice')?.value),sa=$('promoStart')?.value||null,ea=$('promoEnd')?.value||null;const rows=[...document.querySelectorAll('.promoItemRow')].map(r=>({product_id:r.querySelector('.promoItemProduct')?.value,quantity:Math.max(1,Number(r.querySelector('.promoItemQty')?.value)||1)})).filter(x=>x.product_id);if(!n||!rows.length||!Number.isFinite(pp)||pp<0)return toast('Preencha nome, itens e preço promocional.');const products=rows.map(r=>(window.products||[]).find(p=>String(p.id)===String(r.product_id))).filter(Boolean);if(products.length!==rows.length)return toast('Há produto inválido na promoção.');const original=products.reduce((s,p,i)=>s+(Number(p.price)||0)*rows[i].quantity,0);if(pp>=original)return toast('O preço promocional deve ser menor que o valor normal dos itens.');const r=await sb.from('promotions').insert({name:n,description:d||'',product_id:products[0].id,original_price:original,promotional_price:pp,starts_at:sa?new Date(sa).toISOString():null,ends_at:ea?new Date(ea).toISOString():null,active:true}).select('id').single();if(r.error)return toast('Erro ao cadastrar promoção: '+r.error.message);const ins=await sb.from('promotion_items').insert(rows.map(x=>({promotion_id:r.data.id,product_id:x.product_id,quantity:x.quantity})));if(ins.error){await sb.from('promotions').delete().eq('id',r.data.id);return toast('Erro ao salvar os itens da promoção: '+ins.error.message)}e.target.reset();document.getElementById('promoItems')?.replaceChildren();window.addPromoItemRow?.();await window.BV_REFRESH_PROMOTIONS();toast('Promoção cadastrada com '+rows.length+' item(ns).');await window.generatePromotionImage(r.data.id);};
  window.addPromoItemRow=()=>{const box=$('promoItems');if(!box)return;const row=document.createElement('div');row.className='promoItemRow';row.innerHTML='<select class="promoItemProduct" required><option value="">Produto</option>'+((window.products||[]).filter(x=>x.active!==false).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+money(p.price)+'</option>').join(''))+'</select><input class="promoItemQty" type="number" min="1" step="1" value="1" required><button type="button" onclick="this.closest(\'.promoItemRow\').remove()">×</button>';box.appendChild(row)};
  window.togglePromotion=async(id,v)=>{
    if(!sb)return toast('Sistema indisponível.');
    if(v){
      try{
        const promo=(window.promotions||[]).find(x=>String(x.id)===String(id));
        if(!promo)return toast('Promoção não encontrada.');
        const legacy=promo.product_id?[{product_id:promo.product_id,quantity:1}]:[];
        let rows=window.promotionItems?.[promo.id]?.length?window.promotionItems[promo.id]:legacy;
        if(!rows.length){
          const ir=await sb.from('promotion_items').select('product_id,quantity').eq('promotion_id',id);
          if(ir.error)throw ir.error;
          rows=ir.data||[];
        }
        const productIds=[...new Set(rows.map(x=>x.product_id).filter(Boolean))];
        if(productIds.length){
          const pr=await sb.from('products').select('id,name,stock,category,active').in('id',productIds);
          if(pr.error)throw pr.error;
          let out=(pr.data||[]).find(p=>norm(p.category)==='bebidas'&&norm(p.name)==='refri 2l'&&false);if(!out){out=(pr.data||[]).find(p=>norm(p.category)==='bebidas'&&norm(p.name)!=='refri 2l'&&Number(p.stock||0)<=0)}if(!out){const refri=(pr.data||[]).find(p=>norm(p.name)==='refri 2l');if(refri){const fr=await sb.from('product_flavor_stock').select('flavor,stock').eq('product_id',refri.id);if(!fr.error){const total=(fr.data||[]).filter(x=>['guarana','laranja'].includes(norm(x.flavor))).reduce((s,x)=>s+(Number(x.stock)||0),0);if(total<=0)out=refri}}}
          if(out){
            toast('Não é possível ativar: '+(out.name||'Bebida')+' está sem estoque.');
            return;
          }
        }
      }catch(e){
        console.error('[BV PROMO ACTIVATE]',e);
        return toast('Não foi possível verificar o estoque da promoção.');
      }
    }
    const r=await sb.from('promotions').update({active:!!v,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return toast('Erro: '+r.error.message);
    await window.BV_REFRESH_PROMOTIONS();
    toast(v?'Promoção ativada.':'Promoção desativada.');
  };
  window.removePromotion=async id=>{const promo=(window.promotions||[]).find(x=>String(x.id)===String(id));if(!await window.BV_CONFIRM_DELETE_PROMOTION?.(promo))return;const r=await sb.from('promotions').delete().eq('id',id);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.BV_REFRESH_PROMOTIONS();toast('Promoção excluída.')};
  window.adjustProductStock=async(id,delta)=>{
    if(!['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase()))return toast('Acesso restrito ao administrador.');
    if(!sb)return toast('Banco indisponível.');
    const amount=Number(delta)||0;
    if(!amount)return;
    try{
      const fresh=await sb.from('products').select('id,name,stock,active,category').eq('id',id).maybeSingle();
      if(fresh.error)throw fresh.error;
      if(!fresh.data)return toast('Produto não encontrado.');
      const current=Math.max(0,Number(fresh.data.stock)||0),next=Math.max(0,current+amount);
      if(next===current)return;
      const r=await sb.rpc('adjust_product_stock',{p_product_id:id,p_delta:amount});
      if(r.error)throw r.error;
      const saved=Number(r.data)||0;
      const verify=await sb.from('products').select('id,name,stock,active,category').eq('id',id).maybeSingle();
      if(verify.error)throw verify.error;
      if(!verify.data)return toast('Produto não encontrado após atualização.');
      const dbStock=Number(verify.data.stock)||0;
      if(dbStock!==saved)throw new Error('O estoque retornado pelo banco não coincide com o valor salvo.');
      const idx=(window.products||[]).findIndex(x=>String(x.id)===String(id));
      if(idx>=0)window.products[idx]={...window.products[idx],...verify.data};
      else window.products.push(verify.data);
      try{localStorage.setItem('bv_products',JSON.stringify(window.products||[]))}catch(e){}
      window.renderProductsAdmin?.();
      window.renderProducts?.();
      await window.BV_REFRESH_PROMOTIONS?.();
    }catch(e){
      console.error('[BV STOCK SYNC]',e);
      toast('Erro ao sincronizar estoque: '+(e?.message||'tente novamente.'));
    }
  };
  window.BV_REFRESH_FLAVOR_STOCKS=async()=>{
    if(!sb)return false;
    const p=(window.products||[]).find(x=>norm(x?.name)==='refri 2l');
    if(!p)return false;
    try{
      const r=await sb.from('product_flavor_stock').select('product_id,flavor,stock').eq('product_id',p.id);
      if(r.error)throw r.error;
      const next={};
      (r.data||[]).forEach(row=>{
        const flavor=norm(row.flavor);
        if(flavor==='guarana'||flavor==='laranja')
          next[String(row.product_id)+'::'+flavor]=Math.max(0,Number(row.stock)||0);
      });
      window.BV_FLAVOR_STOCKS=next;
      return true;
    }catch(e){
      console.error('[BV REFRI 2L STOCK]',e);
      return false;
    }
  };
  window.adjustProductFlavorStock=async(productId,flavor,delta)=>{
    if(!['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase()))
      return toast('Acesso restrito ao administrador.');
    if(!sb)return toast('Banco de dados indisponível.');
    const key=norm(flavor);
    if(!['guarana','laranja'].includes(key))return toast('Sabor inválido.');
    try{
      const r=await sb.rpc('adjust_product_flavor_stock',{
        p_product_id:String(productId),
        p_flavor:key==='guarana'?'Guaraná':'Laranja',
        p_delta:Number(delta)||0
      });
      if(r.error)throw r.error;
      await window.BV_REFRESH_FLAVOR_STOCKS();
      window.renderProductsAdmin?.();
      window.renderProducts?.();
      toast((key==='guarana'?'Guaraná':'Laranja')+' atualizado: '+Number(r.data||0));
      return Number(r.data||0);
    }catch(e){
      console.error('[BV REFRI 2L STOCK UPDATE]',e);
      toast('Erro ao atualizar estoque de '+(key==='guarana'?'Guaraná':'Laranja')+': '+(e?.message||'tente novamente.'));
      return null;
    }
  };
  window.renderProductsAdmin=async()=>{await window.BV_REFRESH_FLAVOR_STOCKS?.();
    const b=$('manage');if(!b)return;
    const a=(window.products||[]).filter(x=>x.active!==false);
    b.innerHTML=a.map(x=>{
      const fallback=x.category==='Bebidas'?'🥤':'🍔';
      const media=x.image_url?'<img src="'+esc(x.image_url)+'" alt="'+esc(x.name)+'" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+'<span style="display:none">'+fallback+'</span>':'<span>'+fallback+'</span>';
      const isRefrigerante=String(x.category||'')==='Bebidas';
      const stock=Math.max(0,Number(x.stock)||0);
      const isRefri2L=norm(x.name)==='refri 2l';
      const flavorBox=isRefri2L?'<div class="adminStockBox" style="display:block"><span style="display:block;margin-bottom:8px">ESTOQUE POR SABOR</span><div class="adminStockControls" style="justify-content:space-between"><b>🥤 Guaraná</b><button type="button" class="stockMinus" onclick="adjustProductFlavorStock(\''+esc(x.id)+'\',\'Guaraná\',-1)">−</button><strong>'+Number(window.BV_FLAVOR_STOCKS?.[String(x.id)+'::guarana']??0)+'</strong><button type="button" class="stockPlus" onclick="adjustProductFlavorStock(\''+esc(x.id)+'\',\'Guaraná\',1)">+</button></div><div class="adminStockControls" style="justify-content:space-between;margin-top:8px"><b>🍊 Laranja</b><button type="button" class="stockMinus" onclick="adjustProductFlavorStock(\''+esc(x.id)+'\',\'Laranja\',-1)">−</button><strong>'+Number(window.BV_FLAVOR_STOCKS?.[String(x.id)+'::laranja']??0)+'</strong><button type="button" class="stockPlus" onclick="adjustProductFlavorStock(\''+esc(x.id)+'\',\'Laranja\',1)">+</button></div></div>':'';
      const stockHtml=isRefri2L?flavorBox:(isRefrigerante?'<div class="adminStockBox"><span>ESTOQUE</span><div class="adminStockControls"><button type="button" class="stockMinus" aria-label="Diminuir estoque" onclick="adjustProductStock(\''+esc(x.id)+'\',-1)">−</button><strong>'+stock+'</strong><button type="button" class="stockPlus" aria-label="Aumentar estoque" onclick="adjustProductStock(\''+esc(x.id)+'\',1)">+</button></div></div>':'');
      return '<article class="productCard adminProductCard"><div class="productImage">'+media+'</div><div class="productInfo"><small class="eyebrow">'+esc(x.category||'Lanches')+'</small><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'')+'</p>'+stockHtml+'<div class="productBottom"><b>'+money(x.price)+'</b><button type="button" onclick="removeProduct(\''+esc(x.id)+'\')">Excluir produto</button></div></div></article>';
    }).join('')||'<div class="emptyState"><span>📦</span><b>Nenhum produto cadastrado.</b><small>Cadastre um produto para começar seu cardápio.</small></div>';
  };
  window.addProduct=async e=>{e.preventDefault();const role=String(window.BV_ROLE||'').trim().toLowerCase();if(!['administrador','admin'].includes(role))return toast('Acesso restrito ao administrador.');if(!sb)return toast('Banco de dados indisponível. Recarregue a página.');const form=e.target;const n=$('productName')?.value.trim()||'',raw=String($('productPrice')?.value||'').trim().replace(',','.'),p=Number(raw),cat=String($('productCategory')?.value||'').trim(),d=$('productDesc')?.value.trim()||'';if(!n)return toast('Informe o nome do produto.');if(raw===''||!Number.isFinite(p)||p<0)return toast('Informe um valor válido para o produto.');if(!['Lanches','Bebidas','Adicionais'].includes(cat))return toast('Selecione uma categoria válida.');const btn=form.querySelector('.formSave');if(btn){btn.disabled=true;btn.textContent='Cadastrando...'}try{const r=await sb.from('products').insert({name:n,price:p,category:cat,description:d,active:true}).select('id').single();if(r.error)throw r.error;form.reset();if($('productCategory'))$('productCategory').value='Lanches';window.closeProductForm();await window.BV_REFRESH_PRODUCTS();toast('Produto cadastrado com sucesso.')}catch(err){console.error('Cadastro de produto:',err);const msg=err?.message||'Verifique os dados e tente novamente.';toast('Erro ao cadastrar produto: '+msg)}finally{if(btn){btn.disabled=false;btn.textContent='✓ Cadastrar produto'}}};
  window.removeProduct=async id=>{if(!confirm('Excluir este produto do cardápio?'))return;const r=await sb.from('products').update({active:false}).eq('id',id);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.BV_REFRESH_PRODUCTS();toast('Produto removido.')};
  window.BV_REFRESH_PRODUCTS=async()=>{if(!sb)return false;const r=await sb.from('products').select('*').order('created_at');if(r.error){console.error('[BV PRODUCTS]',r.error);let cached=[];try{cached=JSON.parse(localStorage.getItem('bv_products')||'[]')}catch(e){}if(!Array.isArray(window.products)||!window.products.length){if(Array.isArray(cached)&&cached.length)window.products=cached}toast('Não foi possível sincronizar o cardápio agora. Os produtos já carregados foram preservados.');window.renderProducts();window.renderProductsAdmin?.();return false}window.products=Array.isArray(r.data)?r.data:[];try{localStorage.setItem('bv_products',JSON.stringify(window.products))}catch(e){}await window.BV_REFRESH_FLAVOR_STOCKS?.();window.renderProducts();window.renderProductsAdmin?.();window.renderPromotionsAdmin?.();await window.BV_REFRESH_PROMOTIONS?.();return true};
  window.BV_REFRESH_PROMOTIONS?.();
  window.BV_REFRESH_ORDERS=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
    let role=String(window.BV_ROLE||'').trim().toLowerCase();
    if(!role){
      const pr=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();
      role=String(pr.data?.role||'usuario').trim().toLowerCase();
      window.BV_ROLE=role;
    }
    let q=sb.from('orders').select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id,change_for,pix_payment_id,pix_qr_code,pix_qr_code_base64,pix_expires_at,delivery_refused_reason,delivery_refused_at').neq('status','cancelado').order('created_at',{ascending:false});
    if(role==='motoboy')q=q.or('and(status.in.(em_preparo,em_producao),motoboy_id.is.null),and(status.in.(em_preparo,em_producao),motoboy_id.eq.'+user.id+'),and(status.eq.saiu_entrega,motoboy_id.eq.'+user.id+')');else if(!['administrador','admin'].includes(String(role).toLowerCase()))q=q.eq('user_id',user.id);
    const r=await q;if(r.error)return toast('Erro ao carregar pedidos: '+r.error.message);
    const ids=(r.data||[]).map(x=>x.id);let its=[];if(ids.length){const z=await sb.from('order_items').select('order_id,product_id,product_name,quantity').in('order_id',ids);if(!z.error)its=z.data||[]}
    const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
    window.orders=(r.data||[]).map(o=>({id:o.id,orderNumber:o.order_number,created_at:o.created_at,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,changeFor:Number(o.change_for)||null,paymentStatus:o.payment_status||'pendente',status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,pixPaymentId:o.pix_payment_id||null,pixQrCode:o.pix_qr_code||'',pixQrCodeBase64:o.pix_qr_code_base64||'',pixExpiresAt:o.pix_expires_at||null,deliveryRefusedReason:String(o.delivery_refused_reason||'').trim(),deliveryRefusedAt:o.delivery_refused_at||null,items:(g[o.id]||[]).map(i=>({product_id:i.product_id,product_name:i.product_name,quantity:i.quantity}))}));
    if(role==='motoboy'){window.renderMotoOrders?.();return;}
    window.renderAdmin();
    window.renderDashboard();
    // Acompanhar pedido: só redesenha quando os dados realmente mudaram.
    // Isso evita o efeito de "piscar/oscilando" causado pelo polling/realtime.
    if(document.getElementById('page-acompanhar')?.classList.contains('activePage')){
      const trackId=localStorage.getItem('bv_track_id');
      const found=(window.orders||[]).find(x=>String(x.id)===String(trackId));
      if(found){
        const sig=JSON.stringify({
          id:found.id,status:found.rawStatus,payment:found.payment,paymentStatus:found.paymentStatus,
          motoboyId:found.motoboyId,changeFor:found.changeFor,total:found.total,
          pixPaymentId:found.pixPaymentId,pixQrCode:found.pixQrCode,pixQrCodeBase64:found.pixQrCodeBase64,
          pixExpiresAt:found.pixExpiresAt,items:found.items
        });
        if(sig!==window.BV_TRACKING_RENDER_SIG){
          window.BV_TRACKING_RENDER_SIG=sig;
          window.renderTracking(found);
        }
      }
    }
    window.startGlobalPixPolling?.();
  };
  window.BV_GLOBAL_PIX_TIMER=null;
  window.startGlobalPixPolling=()=>{
    if(window.BV_GLOBAL_PIX_TIMER)return;
    const tick=async()=>{
      try{
        const sbx=sb||window.BV_SUPABASE;
        if(!sbx)return;
        const {data:{user}}=await sbx.auth.getUser();
        if(!user)return;
        const pending=(window.orders||[]).filter(o=>String(o.payment||'').toLowerCase()==='pix'&&String(o.paymentStatus||'').toLowerCase()!=='pago'&&!['entregue','cancelado'].includes(String(o.rawStatus||'').toLowerCase()));
        for(const o of pending){
          const r=await sbx.functions.invoke('pix-status',{body:{order_id:o.id}});
          if(!r.error&&r.data?.paid){
            await window.BV_REFRESH_ORDERS?.();
            if(String(localStorage.getItem('bv_track_id'))===String(o.id))window.renderTracking?.((window.orders||[]).find(x=>String(x.id)===String(o.id)));
            toast('✅ PIX confirmado! Pagamento recebido.');
            break;
          }
        }
      }catch(e){console.warn('[BV GLOBAL PIX]',e)}
      window.BV_GLOBAL_PIX_TIMER=setTimeout(tick,5000);
    };
    window.BV_GLOBAL_PIX_TIMER=setTimeout(tick,2000);
  };
  window.BV_TRACKING_POLL_TIMER=null;
window.BV_TRACKING_RENDER_SIG='';
window.startTrackingStatusPolling=()=>{
  if(window.BV_TRACKING_POLL_TIMER)return;
  const tick=async()=>{
    try{
      if(!document.getElementById('page-acompanhar')?.classList.contains('activePage')){window.BV_TRACKING_POLL_TIMER=null;return;}
      await window.BV_REFRESH_ORDERS?.();
      const id=localStorage.getItem('bv_track_id');
      const found=(window.orders||[]).find(x=>String(x.id)===String(id));
      if(found){
        const sig=JSON.stringify({
          id:found.id,status:found.rawStatus,payment:found.payment,paymentStatus:found.paymentStatus,
          motoboyId:found.motoboyId,changeFor:found.changeFor,total:found.total,
          pixPaymentId:found.pixPaymentId,pixQrCode:found.pixQrCode,pixQrCodeBase64:found.pixQrCodeBase64,
          pixExpiresAt:found.pixExpiresAt,items:found.items
        });
        if(sig!==window.BV_TRACKING_RENDER_SIG){
          window.BV_TRACKING_RENDER_SIG=sig;
          window.renderTracking(found);
        }
      }
      if(found&&!['entregue','cancelado'].includes(String(found.rawStatus||'').toLowerCase())) window.BV_TRACKING_POLL_TIMER=setTimeout(tick,3000);
      else window.BV_TRACKING_POLL_TIMER=null;
    }catch(e){console.warn('[BV TRACKING POLL]',e);window.BV_TRACKING_POLL_TIMER=setTimeout(tick,5000);}
  };
  window.BV_TRACKING_POLL_TIMER=setTimeout(tick,1000);
};
window.BV_TRACKING_REALTIME=null;
  window.setupTrackingRealtime=async()=>{
    if(!sb||window.BV_TRACKING_REALTIME)return;
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    window.BV_TRACKING_REALTIME=sb.channel('bv-tracking-'+user.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'user_id=eq.'+user.id},async payload=>{
        // BV_REFRESH_ORDERS já redesenha o acompanhamento somente quando o
        // pedido realmente mudou. Não chamar renderTracking novamente aqui,
        // pois isso fazia o card oscilar a cada evento do Realtime.
        await window.BV_REFRESH_ORDERS?.();
      })
      .subscribe(status=>{console.log('[BV TRACKING] Realtime:',status);});
  };
  window.copyPixCode=async()=>{const code=String(window.BV_PIX_CODE||'');if(!code)return toast('Código PIX indisponível.');try{await navigator.clipboard.writeText(code);toast('Pix Copia e Cola copiado!')}catch{const ta=document.createElement('textarea');ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Pix Copia e Cola copiado!')}};  window.BV_PIX_STATUS_TIMER=null;
  window.stopPixStatusPolling=()=>{if(window.BV_PIX_STATUS_TIMER){clearTimeout(window.BV_PIX_STATUS_TIMER);window.BV_PIX_STATUS_TIMER=null}};
  window.startPixStatusPolling=o=>{
    window.stopPixStatusPolling();
    const order=o||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')));
    if(!order)return;
    const pending=String(order.payment||'').toLowerCase()==='pix' && String(order.paymentStatus||'').toLowerCase()!=='pago' && !['entregue','cancelado'].includes(String(order.rawStatus||'').toLowerCase());
    if(!pending)return;
    const expires=order.pixExpiresAt?new Date(order.pixExpiresAt).getTime():0;
    const poll=async()=>{
      try{
        const sbx=sb||window.BV_SUPABASE;
        if(!sbx)return;
        const r=await sbx.functions.invoke('pix-status',{body:{order_id:order.id}});
        if(!r.error&&r.data?.paid){
          toast('✅ PIX confirmado! Pagamento recebido.');
          await window.BV_REFRESH_ORDERS?.();
          const updated=(window.orders||[]).find(x=>String(x.id)===String(order.id));
          if(updated)window.renderTracking(updated);
          return;
        }
      }catch(e){console.warn('[BV PIX STATUS]',e)}
      if(expires && Date.now()>=expires){window.stopPixStatusPolling();return}
      window.BV_PIX_STATUS_TIMER=setTimeout(poll,4000);
    };
    window.BV_PIX_STATUS_TIMER=setTimeout(poll,1200);
  };
  window.renderTracking=o=>{
    const b=$('trackingResult');
    if(!b)return;
    o=o||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')))||(window.orders||[]).find(x=>!['entregue','cancelado'].includes(String(x.rawStatus||'').toLowerCase()));
    if(!o){b.innerHTML='<div class="trackingEmpty"><span>📦</span><h3>Nenhum pedido selecionado</h3><p>Informe um pedido ou veja seu último pedido para acompanhar o status.</p></div>';return}
    const rawStatus=String(o.rawStatus||o.status||'recebido').trim().toLowerCase();
    const displayStatus=String(status[rawStatus]||o.status||rawStatus||'Pedido recebido');
    o.rawStatus=rawStatus;
    window.BV_PIX_CODE=o.pixQrCode||'';
    const isPix=String(o.payment||'').toLowerCase()==='pix';
    const paid=String(o.paymentStatus||'').toLowerCase()==='pago';
    const steps=[['recebido','Recebido','✓'],['em_preparo','Em preparo','👨‍🍳'],['em_producao','Pronto','🍔'],['saiu_entrega','Saiu para entrega','🏍️'],['entregue','Entregue','✓']];
    let idx=steps.findIndex(x=>x[0]===rawStatus);
    if(idx<0){if(rawStatus==='aguardando_pagamento')idx=0;else if(rawStatus==='cancelado')idx=-1;else idx=0}
    const progress=steps.map((s,i)=>'<div class="trackingProgressStep '+(idx>=i?'done':'')+'"><span>'+s[2]+'</span><small>'+s[1]+'</small></div>').join('');
    const items=window.orderItemsMarkup?window.orderItemsMarkup(o.items||''):esc(o.items||'Itens do pedido');
    const qrRaw=String(o.pixQrCodeBase64||'').trim();const qrSrc=qrRaw?(qrRaw.startsWith('data:image')?qrRaw:'data:image/png;base64,'+qrRaw):'';const qr=qrSrc?'<img src="'+esc(qrSrc)+'" alt="QR Code PIX">':'';
    const pixBox=isPix&&!paid?'<div class="trackingPix waiting"><b>PIX — aguardando pagamento</b><small>Pague pelo QR Code ou use o Pix Copia e Cola.</small>'+qr+(o.pixQrCode?'<button type="button" onclick="copyPixCode()">📋 Copiar Pix Copia e Cola</button>':'<small>QR Code ainda não disponível.</small>')+'</div>':(isPix&&paid?'<div class="trackingPix paid"><b>✅ PIX confirmado</b><small>Pagamento recebido. Pedido liberado para preparo.</small></div>':'');
    const payment=String(o.payment||o.payment_method||'').trim();
    b.innerHTML='<div class="trackingCard trackingCardFixed"><div class="trackingCardTop"><div><small>PEDIDO</small><h3>#'+esc(window.orderLabel(o))+'</h3></div><span class="trackingStatusPill '+esc(rawStatus.replace(/_/g,'-'))+'">'+esc(displayStatus)+'</span></div><div class="trackingProgress">'+progress+'</div><div class="trackingCardSection"><small>ITENS DO PEDIDO</small><div class="trackingItems">'+items+'</div><div class="trackingCardTotal"><span>Total</span><strong>'+money(o.total)+'</strong></div><div class="trackingPayment"><span>Pagamento</span><b>'+esc(payment||'Não informado')+(paid?' • Pago':'')+'</b></div></div>'+pixBox+'</div>';
    if(isPix&&!paid&&!o.pixQrCode)window.startPixQrRecovery(o); else if(o.pixQrCode&&window.BV_PIX_QR_TIMER){clearTimeout(window.BV_PIX_QR_TIMER);window.BV_PIX_QR_TIMER=null;}
    window.startPixStatusPolling?.(o);
  };
  window.trackLastOrder=async()=>{try{await window.BV_REFRESH_ORDERS?.();const o=(window.orders||[])[0];if(!o)return toast('Você ainda não possui pedidos.');localStorage.setItem('bv_track_id',o.id);const input=$('trackId');if(input)input.value=window.orderLabel(o);window.renderTracking(o)}catch{toast('Não foi possível consultar seu último pedido.')}};
  window.trackSpecificOrder=async id=>{const o=(window.orders||[]).find(x=>String(x.id)===String(id));if(!o)return toast('Pedido não encontrado.');localStorage.setItem('bv_track_id',o.id);const input=$('trackId');if(input)input.value=window.orderLabel(o);window.renderTracking(o)};
  window.trackOrder=async()=>{
    try{
      const sbx=sb||window.BV_SUPABASE;
      if(!sbx)return toast('Sistema indisponível. Tente novamente.');
      const {data:{user},error:authError}=await sbx.auth.getUser();
      if(authError||!user)return toast('Faça login para consultar seus pedidos.');

      const raw=($('trackId')?.value||'').replace(/^#/,'').trim();
      const phone=($('trackPhone')?.value||'').replace(/\\D/g,'');

      await window.BV_REFRESH_ORDERS?.();
      if(!raw){
        const orders=window.orders||[];
        const b=$('trackingResult');
        if(!orders.length)return toast('Você ainda não possui pedidos.');
        b.innerHTML='<div class="trackingOrdersList"><div class="trackingListHead"><div><small>MEUS PEDIDOS</small><h3>Todos os seus pedidos</h3><p>Selecione um pedido para acompanhar.</p></div><strong>'+orders.length+'</strong></div>'+
          orders.map(x=>{
          const d=new Date(x.created_at);
          const date=Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR');
          const time=Number.isNaN(d.getTime())?'':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
          return '<button type="button" class="trackingOrderOption" data-order-id="'+esc(String(x.id))+'"><span class="trackingOrderMain"><span class="trackingOrderNumber">#'+esc(window.orderLabel(x))+'</span><span class="trackingOrderStatus">'+esc(x.status||'')+'</span><span class="trackingOrderItems">'+window.orderItemsMarkup(x.items)+'</span></span><span class="trackingOrderMeta"><strong>'+money(x.total)+'</strong><small>'+date+(time?' · '+time:'')+'</small><em>Ver pedido ›</em></span></button>'
        }).join('')+
          '</div>';
        b.querySelectorAll('.trackingOrderOption').forEach(btn=>btn.addEventListener('click',()=>window.trackSpecificOrder(btn.dataset.orderId)));
        return;
      }
      let o=(window.orders||[]).find(x=>{
        const number=String(x.orderNumber||'');
        const label=window.orderLabel(x);
        const id=String(x.id||'');
        return number===raw || label===raw.padStart(3,'0') || id===raw;
      });

      if(!o && /^\\d+$/.test(raw)){
        let q=sbx.from('orders')
          .select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id')
          .eq('id',raw);
        const byId=await q.maybeSingle();
        if(byId.data)o=byId.data;
        if(!o){
          const byNumber=await sbx.from('orders')
            .select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id')
            .eq('user_id',user.id)
            .eq('order_number',Number(raw))
            .maybeSingle();
          if(byNumber.data)o=byNumber.data;
        }
      }

      if(o && o.user_id && String(o.user_id)!==String(user.id))o=null;
      if(o && phone){
        const saved=String(o.phone||'').replace(/\\D/g,'');
        if(saved && saved!==phone)return toast('O WhatsApp informado não corresponde a este pedido.');
      }
      if(!o)return toast('Pedido não encontrado para o cliente logado.');

      if(!o.orderNumber && o.order_number)o.orderNumber=o.order_number;
      if(!o.rawStatus&&o.status)o.rawStatus=o.status;
      if(!o.status||!o.items){
        const its=await sbx.from('order_items').select('product_name,quantity').eq('order_id',o.id);
        if(!its.error){
          o.items=(its.data||[]).map(i=>i.quantity+'x '+i.product_name).join(', ');
        }
        o.status=status[o.rawStatus||o.status]||o.status;
        o.total=Number(o.total)||0;
      }
      localStorage.setItem('bv_track_id',o.id);
      window.renderTracking(o);
    }catch(e){
      console.error('[BV TRACK] Falha ao consultar pedido',e);
      toast('Não foi possível consultar o pedido.');
    }
  };

  window.renderMotoOrders=async()=>{
    if(window.BV_ROLE!=='motoboy')return;
    const b=$('orders');if(!b)return;
    const filters=$('adminOrderFilters');if(filters)filters.style.display='none';
    const deliveryPanel=$('motoDeliveryPanel');if(deliveryPanel)deliveryPanel.style.display='none';
    if(!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Buscando pedidos...</b><small>Atualizando seus pedidos.</small></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const fields='id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';
      // Busca em duas etapas para garantir que um pedido coletado continue visível.
      // 1) pedidos em preparo ainda sem motoboy; 2) pedidos já coletados pelo motoboy atual.
      const [availableRes,assignedRes]=await Promise.all([
        // Todo pedido em "Em preparação" fica disponível para coleta.
        sb.from('orders').select(fields).eq('status','em_preparo').or('motoboy_id.is.null,motoboy_id.eq.'+user.id).order('created_at',{ascending:false}),
        // Depois de coletado, permanece na tela do motoboy até ser entregue.
        sb.from('orders').select(fields).eq('status','saiu_entrega').eq('motoboy_id',user.id).order('created_at',{ascending:false})
      ]);
      if(availableRes.error)throw availableRes.error;
      if(assignedRes.error)throw assignedRes.error;
      const seen=new Set();
      const rows=[...(availableRes.data||[]),...(assignedRes.data||[])].filter(o=>{if(seen.has(String(o.id)))return false;seen.add(String(o.id));return true}).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      const ids=rows.map(x=>x.id);let its=[];
      if(ids.length){const z=await sb.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);if(z.error)throw z.error;its=z.data||[]}
      const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
      const available=rows.map(o=>({id:o.id,orderNumber:o.order_number,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,created_at:o.created_at,items:(g[o.id]||[]).map(i=>i.quantity+'x '+i.product_name).join(', ')}));
      window.orders=available;
      b.innerHTML=available.map(o=>`<article class="orderCard motoOrder"><div class="orderHead"><div><small>PEDIDO</small><b>#${esc(window.orderLabel(o))}</b></div><span class="statusBadge">${esc(o.status)}</span></div><div class="orderBody"><b>${esc(o.customer)}</b><div class="bvOrderItems">${window.orderItemsMarkup(o.items)}</div><div class="motoContactInfo"><div class="motoContactItem"><span>📍 Endereço</span><strong>${esc(o.address?.rua||'Não informado')}${o.address?.bairro?' · '+esc(o.address.bairro):''}</strong></div><div class="motoContactItem"><span>📱 Celular</span><strong>${esc(o.phone||'Não informado')}</strong></div></div></div><div class="motoFeeCard"><span>Taxa de entrega</span><strong>${money(o.deliveryFee)}</strong></div><button class="motoFinishBtn" onclick="motoAction('${esc(o.id)}','${esc(o.rawStatus)}')">${o.rawStatus==='em_preparo'?'📦 Coletar pedido':'✓ Marcar como entregue'}</button></article>`).join('')||'<div class="emptyState"><span>🏍️</span><b>Nenhum pedido disponível</b><small>Os pedidos aparecem aqui quando estiverem disponíveis para coleta ou em entrega.</small></div>';
    }catch(e){console.error('Moto orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar os pedidos</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoOrders()">Tentar novamente</button></div>'}
  };
  window.motoAction=async(id,stage)=>{
    if(!sb)return;
    const isCollect=String(stage)==='em_preparo';
    const isFinish=String(stage)==='saiu_entrega';
    if(!isCollect&&!isFinish)return toast('Etapa do pedido inválida.');
    const r=await sb.rpc('motoboy_collect_or_deliver',{
      p_order_id:id,
      p_action:isCollect?'coletar':'entregar'
    });
    if(r.error)return toast('Erro: '+r.error.message);
    // Não atualiza a lista geral aqui: ela pode sobrescrever a tela do motoboy
    // durante a transição. A própria lista do motoboy é a fonte da tela.
    await window.renderMotoOrders?.();
    if(isFinish)window.renderMotoFeeOrders?.();
    toast(isCollect?'Pedido coletado. Boa entrega!':'Entrega finalizada.');
  };
  window.motoFinish=async id=>window.motoAction(id,'saiu_entrega');

  window.BV_ADMIN_USERS=async()=>{
    if(!sb)return{error:'Banco indisponível.'};
    let lastError='';
    // Tenta a Edge Function duas vezes para absorver falhas transitórias de rede/CORS.
    for(let attempt=1;attempt<=2;attempt++){
      try{
        const r=await sb.functions.invoke('admin-user',{body:{action:'list'}});
        if(!r.error&&r.data?.ok)return{users:Array.isArray(r.data.users)?r.data.users:[]};
        lastError=r.error?.message||r.data?.error||'Não foi possível carregar usuários.';
      }catch(e){lastError=e?.message||String(e)}
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,450));
    }
    // Fallback: a tabela profiles já possui RLS para administrador e permite
    // manter a lista visível mesmo quando o invoke da Edge Function falhar.
    try{
      const p=await sb.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:true});
      if(!p.error&&Array.isArray(p.data)){
        return{users:p.data.map(x=>({id:x.id,email:'',name:x.name||'Usuário',role:x.role||'usuario'}))};
      }
      if(p.error)lastError=p.error.message||lastError;
    }catch(e){lastError=e?.message||String(e)||lastError}
    return{error:lastError||'Não foi possível carregar usuários.'};
  };
  window.renderUsers=async()=>{
  const b=$('userPermissions');if(!b||!window.admin())return;
  b.innerHTML='<div class="userLoading">Carregando usuários...</div>';
  const r=await window.BV_ADMIN_USERS();
  if(r.error){b.innerHTML='<div class="userError">Não foi possível carregar os usuários: '+esc(r.error)+'</div>';return}
  const a=r.users||[],q=norm($('userSearch')?.value||'');
  const filtered=a.filter(x=>norm(x.name||'').includes(q)||norm(x.email||'').includes(q));
  if($('userCount'))$('userCount').textContent=a.length+' usuários';
  b.innerHTML='<div class="permissionTitle"><div><b>Usuários cadastrados</b><small>Defina a permissão de cada conta abaixo.</small></div><span>PERMISSÕES</span></div>'+
    (filtered.map(x=>`<div class="userPerm">
      <div class="userIdentity"><span class="userAvatar">${esc((x.name||x.email||'U').trim().charAt(0).toUpperCase())}</span><div><b>${esc(x.name||'Usuário')}</b><small>${esc(x.email||'')} · ${esc(x.role==='administrador'?'Administrador':x.role==='motoboy'?'Motoboy':'Usuário')}</small></div></div>
      <div class="permissionField"><label>Permissão</label><select onchange="changeUserRole('${esc(x.id)}',this.value)">
        <option value="usuario" ${x.role==='usuario'?'selected':''}>Usuário</option>
        <option value="motoboy" ${x.role==='motoboy'?'selected':''}>Motoboy</option>
        <option value="administrador" ${x.role==='administrador'?'selected':''}>Administrador</option>
      </select></div>
      <button type="button" class="userDelete" onclick="deleteUser('${esc(x.id)}')">Excluir</button>
    </div>`).join('')||'<div class="emptyState"><span>👤</span><b>Nenhum usuário encontrado.</b><small>Cadastre um usuário ou altere a busca.</small></div>');
};
  window.createAdminUser=async()=>{const n=$('newUserName')?.value.trim(),e=$('newUserEmail')?.value.trim(),p=$('newUserPass')?.value||'',role=$('newUserRole')?.value||'usuario';if(!n||!e||p.length<6)return toast('Preencha nome, e-mail e senha com no mínimo 6 caracteres.');const r=await sb.functions.invoke('admin-user',{body:{action:'create',name:n,email:e,password:p,role}});if(r.error||!r.data?.ok)return toast(r.error?.message||r.data?.error||'Não foi possível cadastrar.');await window.renderUsers();toast('Usuário cadastrado.')};
  window.changeUserRole=async(id,role)=>{const r=await sb.functions.invoke('admin-user',{body:{action:'role',user_id:id,role}});if(r.error||!r.data?.ok)return toast(r.error?.message||r.data?.error||'Não foi possível alterar a permissão.');await window.renderUsers();toast('Permissão atualizada.')};
  window.deleteUser=async id=>{
  if(!id)return toast('Usuário inválido.');
  const {data:{user}}=await sb.auth.getUser();
  if(user?.id===id)return toast('Você não pode excluir a própria conta por este painel.');
  if(!confirm('Excluir este usuário definitivamente?'))return;
  const btns=document.querySelectorAll('#userPermissions button.userDelete');
  btns.forEach(b=>b.disabled=true);
  try{
    const r=await sb.functions.invoke('admin-user',{body:{action:'delete',user_id:id}});
    if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'Não foi possível excluir o usuário.');
    toast('Usuário excluído com sucesso.');
    await window.renderUsers();
  }catch(e){console.error('deleteUser',e);toast(e?.message||'Não foi possível excluir o usuário.')}
  finally{btns.forEach(b=>b.disabled=false)}
};

  window.loadApp=async()=>{
    if(!sb)return;
    if(!firstLoginDone()){ $('login')&&$('login').style.setProperty('display','flex','important'); return; }

    // A função de perfil é sempre validada no Supabase antes de aplicar permissões.
    // Isso evita que o cache de uma conta administradora apareça na conta do motoboy.
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user){
      $('login')&&$('login').style.setProperty('display','flex','important');
      return;
    }

    let cachedProducts=null;
    try{cachedProducts=JSON.parse(localStorage.getItem('bv_products')||'null')}catch(e){}
    if(Array.isArray(cachedProducts)&&cachedProducts.length){
      window.products=cachedProducts;
      window.renderProducts();
    }

    const profileRes=await sb.from('profiles').select('name,role').eq('id',user.id).maybeSingle();
    if(profileRes.error||!profileRes.data){
      console.error('[BV PROFILE]',profileRes.error||'Perfil não encontrado');
      toast('Seu perfil não foi encontrado.');
      return;
    }

    window.BV_ROLE=String(profileRes.data.role||'usuario').trim().toLowerCase();
    window.BV_USER_NAME=profileRes.data.name||user.email||'';
    try{
      localStorage.setItem('bv_profile_cache',JSON.stringify({
        name:window.BV_USER_NAME,
        role:window.BV_ROLE,
        userId:user.id
      }));
    }catch(e){}
    window.applyAccess();
    $('login')&&$('login').style.setProperty('display','none','important');

    // Se a conta é motoboy, garante que a interface e a navegação sejam as do motoboy.
    if(window.BV_ROLE==='motoboy'){
      window.applyAccess?.();
      window.applyMotoPageChrome?.();
    }

    if(window.BV_ROLE==='motoboy'){
      // Motoboy entra em Pedidos ou restaura a última tela permitida.
      const saved=getSavedPage();
      const target=['pedidos','taxa-entrega'].includes(saved)?saved:'pedidos';
      window.BV_HAS_NAVIGATED=true;
      window.showPage(target,true);
      window.applyMotoPageChrome?.();
    }else if(!window.BV_HAS_NAVIGATED){
      // Restaura a última tela usada; se não houver uma salva, começa em Início.
      const saved=getSavedPage();
      const allowed=['inicio','cardapio','pedido','acompanhar','dashboard','pedidos','produtos','promocoes','cupons','config','taxa-entrega'];
      const target=allowed.includes(saved)?saved:'inicio';
      window.showPage(target,true);
    }

    // Atualização de dados sem bloquear a abertura do aplicativo.
    Promise.all([
      sb.from('products').select('*').order('created_at'),
      sb.from('settings').select('fee,whatsapp,store_open').eq('id',1).maybeSingle()
    ]).then(async([pr,st])=>{
      if(!pr.error && Array.isArray(pr.data)){
        window.products=pr.data;
        try{localStorage.setItem('bv_products',JSON.stringify(window.products))}catch(e){}
        window.renderProducts();
      }else if(pr.error){
        console.warn('[BV] background products sync failed; preserving current catalog',pr.error);
        window.renderProducts();
      }
      window.BV_DEFAULT_FEE=st?.data?Number(st.data.fee)||0:5;
      window.BV_STORE_OPEN=st?.data?.store_open!==false;
      window.renderStoreStatus?.();
      const topStore=document.querySelector('.adminState');if(topStore)topStore.textContent=window.BV_STORE_OPEN?'Loja aberta':'Loja fechada';
      if($('feeCfg'))$('feeCfg').value=window.BV_DEFAULT_FEE;
      if($('waCfg'))$('waCfg').value=st?.data?.whatsapp||'';
      await Promise.allSettled([window.BV_REFRESH_ORDERS?.(),window.loadProfile?.()]);
    }).catch(e=>console.error('[BV] background sync',e));
  };

  window.addEventListener?.('error',e=>{console.error('BV error',e.error||e.message)});
  document.addEventListener('DOMContentLoaded',async()=>{
    window.applyAccess();window.renderProducts();window.renderCart();window.setupPromotionsRealtime?.();
    if(sb&&firstLoginDone()){const s=await sb.auth.getSession();if(s.data.session)await window.loadApp()}else{$('login')&&$('login').style.setProperty('display','flex','important')}
  });
  if(sb)sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.BV_ROLE='';window.BV_USER_NAME='';window.applyAccess();$('login')&&($('login').style.display='flex')}else if(event==='SIGNED_IN'&&session&&firstLoginDone()){setTimeout(()=>window.loadApp(),100)}});
})();