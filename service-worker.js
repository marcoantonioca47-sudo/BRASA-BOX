const CACHE_NAME='brasabox-pwa-v25';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch(e){data={body:event.data?.text()||''}};
  event.waitUntil(self.registration.showNotification(data.title||'BrasaBox',{
    body:data.body||'Pedido pronto para coleta.',icon:'./icon-192.png',badge:'./icon-192.png',
    tag:data.tag||'bv-order-ready',renotify:true,data:{url:data.url||'./?motoboy=pedidos'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    const target=list.find(c=>c.url.includes(self.location.origin));
    if(target){target.focus();return target;}return clients.openWindow(event.notification?.data?.url||'./?motoboy=pedidos');
  }));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  if(/\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>caches.match(req))
    );
  }
});