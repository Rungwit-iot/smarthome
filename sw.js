const CACHE='plant-guardian-v3';
const ASSETS=['./','./index.html','./plants.json','./firebase-config.js','./phase2.js','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        let html=await response.text();
        if(!html.includes('phase2.js')){
          html=html.replace('</body>','<script src="./phase2.js"></script></body>');
        }
        return new Response(html,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
      }catch(error){
        const cached=await caches.match('./index.html');
        if(!cached) throw error;
        let html=await cached.text();
        if(!html.includes('phase2.js')) html=html.replace('</body>','<script src="./phase2.js"></script></body>');
        return new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});