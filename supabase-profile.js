/* BRASABOX - perfil/endereço sincronizado */
(function(){
  const $=id=>document.getElementById(id);
  let installed=false;
  function start(){
    if(installed||!window.BV_SUPABASE||!window.BV_DB_READY||typeof window.finish!=='function')return false;
    installed=true;
    const sb=window.BV_SUPABASE;
    async function loadProfileData(){
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;
      const {data}=await sb.from('profiles').select('name,phone,street,number,neighborhood,cep,complement').eq('id',user.id).maybeSingle();
      if(!data)return;
      if($('name') && data.name) $('name').value=data.name;
      if($('phone')) $('phone').value=data.phone||'';
      if($('street')) $('street').value=data.street||'';
      if($('num')) $('num').value=data.number||'';
      if($('bairro')) $('bairro').value=data.neighborhood||'';
      if($('cep')) $('cep').value=data.cep||'';
      if($('comp')) $('comp').value=data.complement||'';
      window.BV_PROFILE=data;
      if(typeof renderCart==='function')renderCart();
    }
    async function saveProfileData(){
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;
      const values={name:($('name')?.value||'').trim(),phone:($('phone')?.value||'').trim(),street:($('street')?.value||'').trim(),number:($('num')?.value||'').trim(),neighborhood:($('bairro')?.value||'').trim(),cep:($('cep')?.value||'').trim(),complement:($('comp')?.value||'').trim()};
      const {error}=await sb.from('profiles').update(values).eq('id',user.id);
      if(error)console.warn('Perfil não salvo:',error.message);else window.BV_PROFILE=values;
    }
    const oldFinish=window.finish;
    window.finish=async function(){await saveProfileData();return oldFinish.apply(this,arguments)};
    const oldShowPage=window.showPage;
    window.showPage=function(p){const result=oldShowPage.apply(this,arguments);if(p==='pedido')setTimeout(loadProfileData,80);return result};
    sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN')setTimeout(loadProfileData,300)});
    setTimeout(loadProfileData,500);
    return true;
  }
  const timer=setInterval(()=>{if(start())clearInterval(timer)},100);
  setTimeout(()=>clearInterval(timer),15000);
})();
