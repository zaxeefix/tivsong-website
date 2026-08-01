const VERSION="tiv-songs-v1.0.0";
const STATIC_CACHE=`${VERSION}-static`;
const PAGE_CACHE=`${VERSION}-pages`;
const PRECACHE=["/offline.html","/assets/tiv-song-logo.jpeg","/icon-192.png","/icon-512.png","/assets/theme.js","/assets/site-footer.css"];
self.addEventListener("install",event=>event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE))));
self.addEventListener("activate",event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>!key.startsWith(VERSION)).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(PAGE_CACHE).then(cache=>cache.put(request,copy));return response}).catch(async()=>await caches.match(request)||await caches.match("/offline.html")));
    return;
  }
  if(url.pathname.startsWith("/_next/static/")||url.pathname.startsWith("/assets/"))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(STATIC_CACHE).then(cache=>cache.put(request,response.clone()));return response})));
});
self.addEventListener("sync",event=>{if(event.tag==="tiv-songs-sync")event.waitUntil(self.clients.matchAll().then(clients=>clients.forEach(client=>client.postMessage({type:"SYNC_REQUESTED"}))))});
