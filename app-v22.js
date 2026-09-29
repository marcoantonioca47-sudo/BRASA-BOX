const defaultProducts=[
{id:1,name:"X-Salada",price:12.99,emoji:"🍔",desc:"Pão, ovo, mussarela, requeijão, presunto e salada.",category:"Lanches"},
{id:2,name:"Hambúrguer",price:15,emoji:"🍔",desc:"Pão, bife, presunto, mussarela, milho e requeijão.",category:"Lanches"},
{id:3,name:"X-Egg",price:17,emoji:"🍔",desc:"Pão, bife, presunto, mussarela, ovo, milho, batata e salada.",category:"Lanches"},
{id:4,name:"X-Bacon",price:19,emoji:"🍔",desc:"Pão, bife, bacon, requeijão, presunto, cheddar, mussarela, batata, milho e salada.",category:"Lanches"},
{id:5,name:"BV X-Tudão",price:23,emoji:"🍔",desc:"Pão, 2 bifes, presunto, mussarela, calabresa, requeijão, milho e salada.",category:"Lanches"},
{id:6,name:"X-Explosão",price:27,emoji:"🍔",desc:"Pão, bife, ovo, presunto, mussarela, calabresa, requeijão, batata, milho, cebola, alface e tomate.",category:"Lanches"},
{id:7,name:"X-Caminhoneiro",price:28,emoji:"🍔",desc:"Pão, 2 bifes, ovo, presunto, mussarela, bacon, cheddar, requeijão e salada.",category:"Lanches"},
{id:8,name:"BV-Megã Monstrão",price:34,emoji:"🍔",desc:"Pão, 4 bifes, 2 ovos, calabresa, bacon, cheddar, requeijão, frango desfiado, batata e salada.",category:"Lanches"}
];
function safeParse(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw===null||raw===""?fallback:JSON.parse(raw);
  }catch(e){
    localStorage.removeItem(key);
    return fallback;
  }
}
let products=safeParse("bv_products",null);
if(!Array.isArray(products)||localStorage.bv_products_version!=="2"){
  products=defaultProducts;
  localStorage.bv_products=JSON.stringify(products);
  localStorage.bv_products_version="2";
}
let cart=safeParse("bv_cart",[]),delivery=localStorage.bv_delivery!=="false",payment=localStorage.bv_payment||"Pix",orders=safeParse("bv_orders",[]),config=safeParse("bv_config",{"fee":5,"wa":"5531984595968","bairroFees":{}}),savedAddress=safeParse("bv_saved_address",null);
if(!Array.isArray(cart))cart=[];
if(!Array.isArray(orders))orders=[];
if(!config||typeof config!=="object")config={"fee":5,"wa":"5531984595968","bairroFees":{}};
if(!config.bairroFees||typeof config.bairroFees!=="object")config.bairroFees={};
if(!config.wa||config.wa==="5500000000000"||config.wa==="550000000000"){config.wa="5531984595968";localStorage.bv_config=JSON.stringify(config);}
const brl=n=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const $=id=>document.getElementById(id);
let pendingAdminPage="dashboard";
let trackingTimer=null;
const publicPages=["inicio","cardapio","pedido","acompanhar"];
const adminPages=["dashboard","pedidos","produtos","cupons","config"];
const pageTitles={inicio:"Início",cardapio:"Cardápio",pedido:"Meu pedido",acompanhar:"Acompanhar pedido",dashboard:"Dashboard",pedidos:"Pedidos",produtos:"Produtos",cupons:"Cupons",config:"Configurações"};
function isAdmin(){return sessionStorage.bv==="1"}
function applyAccess(){
  const admin=isAdmin();
  document.querySelectorAll(".adminOnly").forEach(x=>x.style.display=admin?"":"none");
  document.querySelectorAll(".adminHide").forEach(x=>x.style.display=admin?"none":"");
  const adminQuick=$("adminQuick"); if(adminQuick)adminQuick.style.display=admin?"":"none";
  if(admin && ["pedido","acompanhar"].includes(localStorage.bv_page))localStorage.bv_page="inicio";
  if(!admin && adminPages.includes(localStorage.bv_page))localStorage.bv_page="inicio";
}
function showPage(page){
  if(!pageTitles[page])return;
  if(adminPages.includes(page)&&!isAdmin()){pendingAdminPage=page;$("login").style.display="flex";return}
  localStorage.bv_page=page;
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("activePage"));
  const target=$("page-"+page);
  if(!target)return;
  target.classList.add("activePage");
  document.querySelectorAll(".sideNav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  $("pageTitle").textContent=pageTitles[page]||"BRASABOX";
  $("sidebar").classList.remove("open");
  if(page==="pedido")renderCart();
  if(page==="cardapio")renderProducts();
  if(adminPages.includes(page))renderAdmin();
  window.scrollTo(0,0);
}
function closeLogin(){$("login").style.display="none";$("err").textContent=""}
function toggleSidebar(){$("sidebar").classList.toggle("open")}
function openAdmin(page="dashboard"){
  if(isAdmin()){showPage(page);renderAdmin();return}
  pendingAdminPage=page;
  $("login").style.display="flex";
  $("email").focus();
}

function renderProducts(){$("products").innerHTML=products.map(p=>`<article class="product"><div class="photo">${p.emoji}</div><h3>${p.name}</h3><p>${p.desc}</p><div class="price">${brl(p.price)}</div><button class="add" onclick="add(${p.id})">Adicionar</button></article>`).join("");renderManage()}
function saveCart(){localStorage.bv_cart=JSON.stringify(cart)}
function add(id){let p=products.find(x=>x.id===id),i=cart.find(x=>x.id===id);i?i.q++:cart.push({...p,q:1});saveCart();renderCart()}
function change(id,d){let i=cart.find(x=>x.id===id);if(!i)return;i.q+=d;if(i.q<1)cart=cart.filter(x=>x.id!==id);saveCart();renderCart()}
function couponValue(sub){let c=$("coupon").value.trim().toUpperCase();return c==="BV10"?sub*.1:c==="PRIMEIRA"?5:0}
function deliveryFee(){if(!delivery)return 0;let bairro=($("bairro")?.value||"").trim().toLowerCase();if(bairro&&Object.prototype.hasOwnProperty.call(config.bairroFees,bairro))return +config.bairroFees[bairro]||0;return +config.fee||0}
function renderCart(){let sub=cart.reduce((s,x)=>s+x.price*x.q,0),fee=delivery&&sub?deliveryFee():0,disc=couponValue(sub),total=Math.max(0,sub+fee-disc);$("cart").innerHTML=cart.length?cart.map(x=>`<div class="line"><span>${x.q}x ${x.name}<br><small class="mini"><button onclick="change(${x.id},-1)">−</button> <button onclick="change(${x.id},1)">+</button></small></span><b>${brl(x.price*x.q)}</b></div>`).join(""):'<p class="muted">Carrinho vazio.</p>';$("sub").textContent=brl(sub);$("fee").textContent=brl(fee-disc);$("total").textContent=brl(total);$("count").textContent=cart.reduce((s,x)=>s+x.q,0);$("sideCount").textContent=cart.reduce((s,x)=>s+x.q,0);$("quickCount").textContent=cart.reduce((s,x)=>s+x.q,0)}
function mode(m,b){delivery=m==="entrega";localStorage.bv_delivery=String(delivery);document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("address").style.display=delivery?"block":"none";renderCart()}
function pay(p,b){payment=p;localStorage.bv_payment=p;document.querySelectorAll(".pay button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("troco").classList.toggle("hide",p!=="Dinheiro")}
function finish(){
  if(!cart.length)return toast("Adicione um produto.");
  if(delivery&&(!$("name").value||!$("street").value||!$("num").value||!$("bairro").value))return toast("Preencha nome e endereço.");
  if(!delivery&&!$("name").value)return toast("Informe seu nome.");
  let sub=cart.reduce((s,x)=>s+x.price*x.q,0),fee=delivery?deliveryFee():0,disc=couponValue(sub),total=Math.max(0,sub+fee-disc);
  let id=Date.now().toString().slice(-5);
  let address=delivery?{rua:$("street").value.trim(),numero:$("num").value.trim(),bairro:$("bairro").value.trim(),cep:$("cep").value.trim(),complemento:$("comp").value.trim()}:null;
  if(delivery){savedAddress={name:$("name").value.trim(),phone:$("phone").value.trim(),...address};localStorage.bv_saved_address=JSON.stringify(savedAddress);}
  let o={id:id,customer:$("name").value.trim()||"Cliente",phone:$("phone").value.trim(),items:cart.map(x=>x.q+"x "+x.name).join(", "),total:total,payment:payment,delivery:delivery?"Entrega":"Retirada",address:address,change:payment==="Dinheiro"?($("troco").value||"Não informado"):"",status:payment==="Pix"?"Aguardando pagamento":"Novo",paid:payment!=="Pix",time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
  orders.unshift(o);
  localStorage.bv_orders=JSON.stringify(orders);
  renderAdmin();
  let msg="🍔 *BRASABOX — PEDIDO #"+id+"*%0A"+o.items+"%0A%0A*Total:* "+brl(total)+"%0A*Pagamento:* "+payment+"%0A*Modalidade:* "+o.delivery+"%0A";
  if(delivery)msg+="%0A📍 *Endereço:* "+address.rua+", "+address.numero+" — "+address.bairro+(address.cep?" — CEP "+address.cep:"")+(address.complemento?"%0A🏠 "+address.complemento:"");
  if(payment==="Dinheiro")msg+="%0A💵 Troco para: "+o.change;
  if(payment==="Pix")msg+="%0A⏳ *Aguardando confirmação do pagamento Pix.*";
  localStorage.bv_last_order=JSON.stringify({id:id,phone:o.phone});
  cart=[];saveCart();renderCart();
  $("trackId").value=o.id;
  $("trackPhone").value=o.phone;
  showPage("acompanhar");
  renderTracking(o);
  toast(payment==="Pix"?"Pedido criado. Aguardando pagamento Pix.":"Pedido criado com sucesso!");
}
function confirmPix(id){
  let o=orders.find(x=>x.id===id);
  if(!o||o.payment!=="Pix")return;
  o.paid=true;o.status="Confirmado";o.paidAt=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  localStorage.bv_orders=JSON.stringify(orders);renderAdmin();toast("Pix confirmado. Pedido confirmado!");
}
function renderAdmin(){
  const delivered=orders.filter(o=>o.status==="Entregue");
  const revenue=delivered.reduce((sum,o)=>sum+(Number(o.total)||0),0);
  $("sOrders").textContent=delivered.length;
  $("sRevenue").textContent=brl(revenue);
  $("sAvg").textContent=brl(delivered.length?revenue/delivered.length:0);
  const pending=orders.filter(o=>o.status==="Novo"||o.status==="Aguardando pagamento").length;
  $("sNew").textContent=pending;
  $("sideNew").textContent=pending;
  $("dashNotice").textContent=pending?"🔔 "+pending+" pedido(s) aguardando atendimento/pagamento.":"Nenhum pedido novo.";

  const dashboard=$("dashboardOrders");
  if(dashboard){
    dashboard.innerHTML=delivered.length?delivered.map(o=>`
      <div class="order">
        <div class="line"><b>#${o.id} — ${o.customer}</b><span class="status">Entregue</span></div>
        <p><b>Itens:</b> ${o.items}</p>
        <p class="orderInfo"><b>💳 Pagamento:</b> ${o.payment}${o.paid?" · ✅ Pago":""}</p>
        <div class="mini">${brl(Number(o.total)||0)} · ${o.time}</div>
      </div>`).join(""):'<p class="muted">Nenhum pedido entregue ainda.</p>';
  }

  const ordersBox=$("orders");
  if(!ordersBox)return;
  ordersBox.innerHTML=orders.length?orders.map(o=>{
    const address=o.address?(o.address.rua+", "+o.address.numero+" — "+o.address.bairro+(o.address.cep?" · CEP "+o.address.cep:"")+(o.address.complemento?" · "+o.address.complemento:"")):"Retirada no local";
    const pixButton=o.payment==="Pix"&&!o.paid?`<button class="confirmPix" onclick="confirmPix('${o.id}')">✅ Confirmar pagamento Pix</button>`:"";
    const options=["Aguardando pagamento","Novo","Confirmado","Em preparo","Pronto","Saiu para entrega","Entregue","Cancelado"].map(st=>`<option ${o.status===st?"selected":""}>${st}</option>`).join("");
    return `
      <div class="order">
        <div class="line"><b>#${o.id} — ${o.customer}</b><span class="status">${o.status}</span></div>
        <p><b>Itens:</b> ${o.items}</p>
        <p class="orderInfo"><b>📍 ${o.delivery||"Entrega"}:</b> ${address}</p>
        <p class="orderInfo"><b>💳 Pagamento:</b> ${o.payment}${o.paid?" · ✅ Pago":""}${o.payment==="Dinheiro"&&o.change?" · Troco para "+o.change:""}</p>
        <div class="mini">${brl(Number(o.total)||0)} · ${o.time}${o.paidAt?" · Pago às "+o.paidAt:""}</div>
        ${pixButton}
        <select onchange="statusOrder('${o.id}',this.value)">${options}</select>
      </div>`;
  }).join(""):'<p class="muted">Nenhum pedido.</p>';
}
function statusOrder(id,s){
  let o=orders.find(x=>x.id===id);
  if(!o)return;
  if(o.payment==="Pix"&&!o.paid&&s!=="Aguardando pagamento")return toast("Confirme o pagamento Pix antes de avançar o pedido.");
  o.status=s;localStorage.bv_orders=JSON.stringify(orders);renderAdmin();renderTracking();
  toast("Status atualizado");
}
function orderProgress(status){
  const steps=["Novo","Confirmado","Em preparo","Pronto","Saiu para entrega","Entregue"];
  if(status==="Aguardando pagamento")return 0;
  if(status==="Cancelado")return -1;
  let i=steps.indexOf(status);return i<0?0:i;
}
function renderTracking(order){
  let r=$("trackingResult"); if(!r)return;
  if(!order){
    let last=safeParse("bv_last_order",null);
    if(last) order=orders.find(x=>x.id===last.id&&x.phone===last.phone);
  }
  if(!order){
    r.innerHTML='<p class="muted">Digite os dados do pedido para consultar.</p>';return;
  }
  let address=order.address?(order.address.rua+", "+order.address.numero+" — "+order.address.bairro):"Retirada no local";
  let steps=["Novo","Confirmado","Em preparo","Pronto","Saiu para entrega","Entregue"],p=orderProgress(order.status);
  let timeline=order.status==="Cancelado"
    ? '<div class="cancelBox">❌ Pedido cancelado</div>'
    : order.payment==="Pix"&&!order.paid
      ? '<div class="paymentBox">🔷 Aguardando confirmação do pagamento Pix</div>'
      : '<div class="timeline">'+steps.map((s,i)=>'<div class="step '+(i<=p?"done":"")+'"><span>'+(i<=p?"✓":(i+1))+'</span><b>'+s+'</b></div>').join("")+'</div>';
  r.innerHTML='<div class="trackHead"><div><small>Pedido</small><h3>#'+order.id+'</h3></div><span class="status">'+order.status+'</span></div>'+timeline+
    '<div class="trackInfo"><p><b>Itens:</b> '+order.items+'</p><p><b>Total:</b> '+brl(order.total)+'</p><p><b>Pagamento:</b> '+order.payment+(order.paid?" · Pago":"")+'</p><p><b>Modalidade:</b> '+order.delivery+'</p><p><b>📍 Local:</b> '+address+'</p><p><b>Horário:</b> '+order.time+'</p></div>';
}
function trackOrder(){
  let id=$("trackId").value.trim(),phone=$("trackPhone").value.replace(/\D/g,"");
  let o=orders.find(x=>String(x.id)===id&&String(x.phone||"").replace(/\D/g,"")===phone);
  if(!o)return toast("Pedido não encontrado. Confira número e WhatsApp.");
  localStorage.bv_last_order=JSON.stringify({id:o.id,phone:o.phone});
  renderTracking(o);
}
function trackLastOrder(){let last=safeParse("bv_last_order",null);if(!last)return toast("Ainda não há pedido neste aparelho.");$("trackId").value=last.id;$("trackPhone").value=last.phone||"";trackOrder();}

function renderManage(){$("manage").innerHTML=products.map((p,i)=>`<div class="manageProduct"><div class="manageProductInfo"><div class="manageEmoji">${p.emoji}</div><div><h3>${String(p.name).replace(/</g,"&lt;")}</h3><strong>${brl(p.price)}</strong><p>${String(p.desc||"Sem descrição").replace(/</g,"&lt;")}</p></div></div><button class="deleteProduct" onclick="removeProduct(${i})">Excluir</button></div>`).join("")}
function addProduct(){let n=prompt("Nome do produto:");if(!n)return;let v=parseFloat(prompt("Valor do produto (R$):","20").replace(",","."));if(isNaN(v)||v<0)return toast("Informe um valor válido.");let d=prompt("Descrição do produto:","Pão, hambúrguer e ingredientes.");if(d===null)return;products.push({id:Date.now(),name:n.trim(),price:v,emoji:"🍔",desc:d.trim()||"Sem descrição"});localStorage.bv_products=JSON.stringify(products);renderProducts();toast("Produto adicionado com sucesso!")}
function removeProduct(i){if(confirm("Excluir este produto?")){products.splice(i,1);localStorage.bv_products=JSON.stringify(products);renderProducts();toast("Produto excluído.")}}
function renderBairroFees(){let el=$("bairroFees");if(!el)return;let entries=Object.entries(config.bairroFees||{}).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR"));el.innerHTML=entries.length?'<div class="bairroList">'+entries.map(([b,v])=>`<div class="manageRow"><span>📍 <b>${b.replace(/</g,"&lt;")}</b> — ${brl(+v)}</span><button onclick="removeBairroFee('${b.replace(/'/g,"\\'")}')">Excluir</button></div>`).join("")+'</div>':'<p class="muted">Nenhum bairro cadastrado.</p>'}
function addBairroFee(){let bairroEl=$("bairroCfg"),feeEl=$("bairroFeeCfg");if(!bairroEl||!feeEl)return toast("Campos de bairro não encontrados.");let b=bairroEl.value.trim().toLowerCase(),v=parseFloat(feeEl.value.replace(",","."));if(!b)return toast("Informe o bairro.");if(isNaN(v)||v<0)return toast("Informe uma taxa válida.");if(!config.bairroFees||typeof config.bairroFees!=="object")config.bairroFees={};config.bairroFees[b]=v;localStorage.bv_config=JSON.stringify(config);bairroEl.value="";feeEl.value="";renderBairroFees();renderCart();toast("Taxa do bairro cadastrada com sucesso!")}
function removeBairroFee(b){delete config.bairroFees[b];localStorage.bv_config=JSON.stringify(config);renderBairroFees();renderCart();toast("Bairro removido.")}
function saveCfg(){config.fee=parseFloat($("feeCfg").value)||0;config.wa=$("waCfg").value.replace(/\D/g,"");localStorage.bv_config=JSON.stringify(config);renderBairroFees();renderCart();toast("Configurações salvas")}
function restoreSavedAddress(){
  if(!savedAddress)return;
  if(savedAddress.name)$("name").value=savedAddress.name;
  if(savedAddress.phone)$("phone").value=savedAddress.phone;
  if(savedAddress.rua)$("street").value=savedAddress.rua;
  if(savedAddress.numero)$("num").value=savedAddress.numero;
  if(savedAddress.bairro)$("bairro").value=savedAddress.bairro;
  if(savedAddress.cep)$("cep").value=savedAddress.cep;
  if(savedAddress.complemento)$("comp").value=savedAddress.complemento;
}
function demoOrder(){orders.unshift({id:Date.now().toString().slice(-5),customer:"Cliente Demo",items:"1x X-Bacon, 1x Batata P",total:36.9,payment:"Pix",delivery:"Entrega",address:{rua:"Rua Demo",numero:"100",bairro:"Centro",cep:"00000-000",complemento:""},status:"Aguardando pagamento",paid:false,time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})});localStorage.bv_orders=JSON.stringify(orders);renderAdmin();toast("🔔 Pedido Pix aguardando pagamento")}function toast(t){$("toast").textContent=t;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2500)}
function login(){let email=$("email").value.trim().toLowerCase(),pass=$("pass").value;if(email==="marco@bv.com"&&pass==="123456"){sessionStorage.setItem("bv","1");$("login").style.display="none";$("err").textContent="";applyAccess();showPage(pendingAdminPage);renderAdmin()}else if(email==="usuario@bv.com"&&pass==="123456"){sessionStorage.setItem("bv_user","1");$("login").style.display="none";$("err").textContent="";showPage("inicio")}else $("err").textContent="E-mail ou senha incorretos."}
function logout(){sessionStorage.clear();localStorage.bv_page="inicio";applyAccess();showPage("inicio");$("login").style.display="flex";$("email").value="";$("pass").value="";$("err").textContent="";$("email").focus();toast("Todas as contas foram desconectadas")}
if(isAdmin())$("login").style.display="none";applyAccess();showPage(isAdmin()&&adminPages.includes(localStorage.bv_page)?localStorage.bv_page:(publicPages.includes(localStorage.bv_page)?localStorage.bv_page:"inicio"));
$("coupon").addEventListener("input",renderCart);$("bairro")?.addEventListener("input",renderCart);$("feeCfg").value=config.fee;$("waCfg").value=config.wa;renderBairroFees();
renderProducts();renderCart();renderAdmin();restoreSavedAddress();renderTracking();
if(trackingTimer)clearInterval(trackingTimer);
trackingTimer=setInterval(()=>{if($("page-acompanhar")?.classList.contains("activePage"))renderTracking()},3000);
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
