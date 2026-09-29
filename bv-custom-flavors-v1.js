/* BRASABOX — sabores personalizados para bebidas v1 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const db=()=>window.BV_SUPABASE||window.sb;
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const admin=()=>['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase());
const generic=p=>String(p?.category||'')==='Bebidas'&&!['refri 2l','refri mini'].includes(norm(p?.name));
let flavorCache={};
async function load(id){
 const b=db(); if(!b||!id)return [];
 const r=await b.from('product_flavor_stock').select('id,product_id,flavor,stock').eq('product_id',id).order('flavor');
 if(r.error){console.error('[BV FLAVORS]',r.error);return []}
 flavorCache[id]=r.data||[]; return flavorCache[id];
}
function rowsHtml(rows){
 return rows.map((x,i)=>'<div class="bvFlavorAdminRow" data-id="'+esc(x.id||'')+'"><input class="bvFlavorName" value="'+esc(x.flavor)+'" placeholder="Sabor"><input class="bvFlavorQty" type="number" min="0" step="1" value="'+Math.max(0,Number(x.stock)||0)+'"><button type="button" class="bvFlavorSave" data-i="'+i+'">Salvar</button><button type="button" class="bvFlavorRemove" data-id="'+esc(x.id||'')+'">×</button></div>').join('');
}
async function renderCardFlavors(){
 if(!admin())return;
 const products=(window.products||[]).filter(generic);
 for(const p of products){
   const card=[...document.querySelectorAll('#manage .adminProductCard')].find(c=>norm(c.querySelector('h3')?.textContent)===norm(p.name));
   if(!card)continue;
   let box=card.querySelector('.bvCustomFlavorStock');
   if(!box){box=document.createElement('div');box.className='bvCustomFlavorStock';(card.querySelector('.productInfo')||card).appendChild(box)}
   const rows=await load(p.id);
   box.innerHTML='<div class="bvFlavorAdminHead"><div><b>ESTOQUE POR SABOR</b><small>Defina a quantidade de cada sabor</small></div><button type="button" class="bvAddFlavorBtn">＋ Novo sabor</button></div><div class="bvFlavorRows">'+(rowsHtml(rows)||'<small class="bvFlavorEmpty">Nenhum sabor cadastrado.</small>')+'</div>';
   box.querySelector('.bvAddFlavorBtn').onclick=async()=>{const name=prompt('Nome do novo sabor');if(!name?.trim())return;const qty=Number(prompt('Quantidade disponível para '+name.trim(),'0'));if(!Number.isFinite(qty)||qty<0)return window.toast?.('Quantidade inválida.');const r=await db().rpc('set_product_flavor_stock',{p_product_id:p.id,p_flavor:name.trim(),p_stock:Math.floor(qty)});if(r.error)return window.toast?.('Erro ao cadastrar sabor: '+r.error.message);await renderCardFlavors();window.renderProducts?.();window.toast?.('Sabor '+name.trim()+' cadastrado.');};
   box.querySelectorAll('.bvFlavorSave').forEach(btn=>btn.onclick=async()=>{const row=btn.closest('.bvFlavorAdminRow'),name=row?.querySelector('.bvFlavorName')?.value.trim(),qty=Number(row?.querySelector('.bvFlavorQty')?.value);if(!name)return window.toast?.('Informe o sabor.');if(!Number.isInteger(qty)||qty<0)return window.toast?.('Quantidade inválida.');btn.disabled=true;const r=await db().rpc('set_product_flavor_stock',{p_product_id:p.id,p_flavor:name,p_stock:qty});btn.disabled=false;if(r.error)return window.toast?.('Erro ao salvar: '+r.error.message);await renderCardFlavors();window.renderProducts?.();window.toast?.('Estoque de '+name+' atualizado.');});
   box.querySelectorAll('.bvFlavorRemove').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.id;if(!id)return; if(!confirm('Excluir este sabor?'))return;const r=await db().from('product_flavor_stock').delete().eq('id',id);if(r.error)return window.toast?.('Erro ao excluir sabor: '+r.error.message);await renderCardFlavors();window.renderProducts?.();});
 }
}
const oldRender=window.renderProductsAdmin;
window.renderProductsAdmin=async function(){const r=typeof oldRender==='function'?await oldRender.apply(this,arguments):undefined;await renderCardFlavors();return r};
window.BV_REFRESH_CUSTOM_FLAVORS=renderCardFlavors;


function installProductImagePicker(){
 const form=document.querySelector('#page-produtos form.productForm');
 if(!form||form.dataset.imagePicker==='1')return;
 form.dataset.imagePicker='1';
 const label=document.createElement('label');
 label.className='bvProductImageField';
 label.innerHTML='<span>Imagem do produto</span><div class="bvImagePickerRow"><button type="button" class="bvImportImageBtn" id="bvImportImageBtn">🖼️ Importar imagem</button><span class="bvImageName" id="bvImageName">Nenhuma imagem selecionada</span></div><input id="bvProductImageInput" type="file" accept="image/*" hidden><img id="bvProductImagePreview" class="bvProductImagePreview" alt="Pré-visualização" hidden>';
 const desc=document.getElementById('productDesc');
 if(desc&&desc.closest('label'))desc.closest('label').insertAdjacentElement('afterend',label);
 const input=label.querySelector('#bvProductImageInput'),btn=label.querySelector('#bvImportImageBtn'),name=label.querySelector('#bvImageName'),preview=label.querySelector('#bvProductImagePreview');
 btn.onclick=()=>input.click();
 input.onchange=()=>{const file=input.files&&input.files[0];if(!file)return;name.textContent=file.name;preview.src=URL.createObjectURL(file);preview.hidden=false;};
 window.BV_GET_PRODUCT_IMAGE=()=>input.files&&input.files[0]||null;
}

function installForm(){
 installProductImagePicker();
 const form=document.querySelector('#page-produtos form.productForm'),cat=$('productCategory');
 if(!form||!cat||form.dataset.customFlavors==='1')return;
 form.dataset.customFlavors='1';
 const wrap=document.createElement('div');wrap.className='bvNewFlavorPanel';wrap.innerHTML='<div class="bvNewFlavorHead"><div><b>Sabores da bebida</b><small>Cadastre sabores e a quantidade individual de estoque.</small></div><button type="button" id="bvNewFlavorBtn">＋ Novo sabor</button></div><div id="bvNewFlavorRows"></div>';
 cat.closest('label')?.insertAdjacentElement('afterend',wrap);
 function sync(){wrap.style.display=cat.value==='Bebidas'?'block':'none'}
 function addRow(name='',qty=0){
  const r=document.createElement('div');r.className='bvNewFlavorRow';r.innerHTML='<input class="bvNewFlavorName" placeholder="Ex.: Guaraná" value="'+esc(name)+'"><input class="bvNewFlavorQty" type="number" min="0" step="1" value="'+Math.max(0,Number(qty)||0)+'"><button type="button" class="bvNewFlavorDel">×</button>';r.querySelector('.bvNewFlavorDel').onclick=()=>r.remove();$('bvNewFlavorRows').appendChild(r)
 }
 $('bvNewFlavorBtn').onclick=()=>addRow();
 cat.addEventListener('change',sync);sync();
 form.dataset.flavorApi='1';
 window.BV_GET_NEW_FLAVORS=()=>[...form.querySelectorAll('.bvNewFlavorRow')].map(r=>({flavor:r.querySelector('.bvNewFlavorName')?.value.trim(),stock:Number(r.querySelector('.bvNewFlavorQty')?.value)})).filter(x=>x.flavor);
}
function wrapAddProduct(){
 if(window.BV_CUSTOM_FLAVOR_ADD_PRODUCT)return;
 const old=window.addProduct;if(typeof old!=='function')return;
 window.addProduct=async function(e){
   e.preventDefault();
   if(!admin())return window.toast?.('Acesso restrito ao administrador.');
   const b=db(),form=e.target,cat=$('productCategory')?.value||'',flavors=cat==='Bebidas'?(window.BV_GET_NEW_FLAVORS?.()||[]):[];
   if(cat==='Bebidas'){
     const seen=new Set();
     for(const f of flavors){const k=norm(f.flavor);if(!k)return window.toast?.('Informe todos os sabores.');if(seen.has(k))return window.toast?.('Não repita o mesmo sabor.');if(!Number.isInteger(f.stock)||f.stock<0)return window.toast?.('Quantidade inválida para '+f.flavor+'.');seen.add(k)}
   }
   const n=$('productName')?.value.trim()||'',price=Number(String($('productPrice')?.value||'').replace(',','.')),d=$('productDesc')?.value.trim()||'';
   const imageFile=window.BV_GET_PRODUCT_IMAGE?.();
   let imageUrl='';
   if(imageFile){
     if(!imageFile.type.startsWith('image/'))return window.toast?.('Selecione uma imagem válida.');
     if(imageFile.size>8*1024*1024)return window.toast?.('A imagem deve ter no máximo 8 MB.');
     imageUrl=await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const max=900,sc=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82));};im.onerror=reject;im.src=rd.result};rd.onerror=reject;rd.readAsDataURL(imageFile)});
   }
   if(!n||!Number.isFinite(price)||price<0)return window.toast?.('Preencha nome e valor corretamente.');
   const btn=form.querySelector('.formSave');if(btn){btn.disabled=true;btn.textContent='Cadastrando...'}
   try{
     const r=await b.from('products').insert({name:n,price,category:cat,description:d,image_url:imageUrl,active:true,stock:1}).select('id').single();if(r.error)throw r.error;
     for(const f of flavors){const z=await b.rpc('set_product_flavor_stock',{p_product_id:r.data.id,p_flavor:f.flavor,p_stock:Math.floor(f.stock)});if(z.error)throw z.error}
     form.reset();if($('productCategory'))$('productCategory').value='Lanches';window.closeProductForm?.();await window.BV_REFRESH_PRODUCTS?.();await renderCardFlavors();window.toast?.('Sucesso! Seu produto foi cadastrado.');
   }catch(err){console.error('[BV PRODUCT]',err);window.toast?.('Erro ao cadastrar produto: '+(err?.message||'tente novamente.'))}
   finally{if(btn){btn.disabled=false;btn.textContent='✓ Cadastrar produto'}}
 };
 window.BV_CUSTOM_FLAVOR_ADD_PRODUCT=true;
}
function patchGenericCartAdd(){
 if(window.BV_CUSTOM_GENERIC_CART_ADD)return;
 window.BV_CUSTOM_GENERIC_CART_ADD=true;
 const old=window.BV_ADD_PRODUCT_TO_CART;
 window.BV_ADD_PRODUCT_TO_CART=async function(p,flavor=''){
   const f=String(flavor||'').trim(), key=norm(f);
   if(generic(p)&&f){
     const rows=await load(p.id), row=rows.find(x=>norm(x.flavor)===key);
     if(!row)return window.toast?.('Sabor não encontrado.');
     const cid=String(p.id)+'::'+key, existing=(window.cart||[]).find(x=>String(x.id)===cid);
     if((Number(existing?.q)||0)>=Number(row.stock||0))return window.toast?.('Estoque máximo disponível para '+f+'.');
     if(existing)existing.q++; else (window.cart=window.cart||[]).push({id:cid,productId:p.id,name:String(p.name)+' — '+f,price:Number(p.price)||0,q:1,category:'Bebidas',flavor:f});
     localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));window.renderCart?.();if($('count'))$('count').textContent=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);window.toast?.('Produto adicionado ao pedido.');return;
   }
   return old?.(p,flavor);
 };
}
async function install(){
 installForm();wrapAddProduct();patchGenericCartAdd();
 const oldAdd=window.addToCart;
 if(!window.BV_CUSTOM_FLAVOR_CART_PATCH&&typeof oldAdd==='function'){
   window.addToCart=async function(id){
     const p=(window.products||[]).find(x=>String(x.id)===String(id));
     if(!generic(p))return oldAdd.apply(this,arguments);
     const rows=await load(p.id);
     if(!rows.length)return oldAdd.apply(this,arguments);
     const m=document.createElement('div');m.className='bvGenericFlavorModal';m.innerHTML='<div class="bvGenericFlavorBox"><button type="button" class="bvGenericFlavorClose">×</button><small>ESCOLHA O SABOR</small><h3>'+esc(p.name)+'</h3><div class="bvGenericFlavorChoices"></div></div>';document.body.appendChild(m);
     const close=()=>m.remove();m.querySelector('.bvGenericFlavorClose').onclick=close;
     const box=m.querySelector('.bvGenericFlavorChoices');
     rows.forEach(x=>{const btn=document.createElement('button');btn.type='button';btn.disabled=Number(x.stock)<=0;btn.innerHTML=esc(x.flavor)+' <small>'+Number(x.stock)+' disponíveis</small>';btn.onclick=()=>{const cid=p.id+'::'+norm(x.flavor);const old=window.cart?.find(i=>String(i.id)===cid);if((Number(old?.q)||0)>=Number(x.stock))return window.toast?.('Estoque máximo disponível para '+x.flavor+'.');window.BV_ADD_PRODUCT_TO_CART?.(p,x.flavor);close()};box.appendChild(btn)});
     m.onclick=e=>{if(e.target===m)close()};
   };
   window.BV_CUSTOM_FLAVOR_CART_PATCH=true;
 }
 await renderCardFlavors();
}
const st=document.createElement('style');st.id='bvCustomFlavorStyle';st.textContent='.bvCustomFlavorStock,.bvNewFlavorPanel{margin:12px 0 4px;padding:12px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}.bvFlavorAdminHead,.bvNewFlavorHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.bvFlavorAdminHead b,.bvNewFlavorHead b{display:block;font-size:10px;letter-spacing:.1em}.bvFlavorAdminHead small,.bvNewFlavorHead small{display:block;margin-top:3px;font-size:10px;color:#8f96a0}.bvAddFlavorBtn,#bvNewFlavorBtn{border:1px solid rgba(229,9,20,.35);background:rgba(229,9,20,.12);color:#fff;border-radius:9px;padding:8px 10px;font-weight:900;cursor:pointer;white-space:nowrap}.bvFlavorAdminRow,.bvNewFlavorRow{display:grid;grid-template-columns:minmax(0,1fr) 90px 68px 38px;gap:6px;margin-top:7px}.bvNewFlavorRow{grid-template-columns:minmax(0,1fr) 90px 38px}.bvFlavorAdminRow input,.bvNewFlavorRow input{width:100%;box-sizing:border-box;background:#080a0d;color:#fff;border:1px solid #343a44;border-radius:8px;padding:9px}.bvFlavorAdminRow button,.bvNewFlavorRow button{border:1px solid #343a44;border-radius:8px;background:#20242a;color:#fff;font-weight:900;cursor:pointer}.bvFlavorAdminRow .bvFlavorSave{background:#e50914;border-color:#e50914}.bvFlavorAdminRow .bvFlavorRemove,.bvNewFlavorRow .bvNewFlavorDel{font-size:18px}.bvFlavorEmpty{display:block;color:#8f96a0;padding:5px 0}.bvGenericFlavorModal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.78)}.bvGenericFlavorBox{width:min(430px,100%);padding:20px;border-radius:18px;background:#17191d;color:#fff;border:1px solid #343a44}.bvGenericFlavorClose{float:right;background:none;border:0;color:#fff;font-size:28px}.bvGenericFlavorChoices{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.bvGenericFlavorChoices button{padding:14px;border:1px solid #343a44;border-radius:12px;background:#22262d;color:#fff;font-weight:900}.bvGenericFlavorChoices button:disabled{opacity:.45}@media(max-width:600px){.bvFlavorAdminRow{grid-template-columns:minmax(0,1fr) 76px 60px 34px}.bvNewFlavorRow{grid-template-columns:minmax(0,1fr) 76px 34px}.bvGenericFlavorChoices{grid-template-columns:1fr}}';document.head.appendChild(st);
document.addEventListener('DOMContentLoaded',install,{once:true});setTimeout(install,1000);
})();
(function(){if(document.getElementById('bvProductImageStyle'))return;const st=document.createElement('style');st.id='bvProductImageStyle';st.textContent='.bvProductImageField{margin-top:12px}.bvImagePickerRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.bvImportImageBtn{border:0;border-radius:12px;padding:11px 15px;font-weight:800;cursor:pointer}.bvImageName{font-size:12px;opacity:.72}.bvProductImagePreview{display:block;width:110px;height:110px;object-fit:cover;border-radius:14px;margin-top:10px}';document.head.appendChild(st)})();