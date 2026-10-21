// Service worker dell'applicazione pubblicata (GitHub Pages), copiato accanto a index.html da pubblica.py.
// Rete prima: con internet si scarica sempre la versione nuova (e se ne tiene una copia);
// senza internet si apre l'ultima copia. Così l'app installata si apre anche in cantiere senza rete,
// e non resta mai bloccata su una versione vecchia quando la rete c'è.
const CACHE='gestionale';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  // la pagina si chiede sempre al sito (no-cache): il sito la fa tenere 10 minuti nella memoria del
  // browser, e senza questo dopo una pubblicazione si continuava a usare la versione vecchia
  const rete=r.mode==='navigate'?fetch(r.url,{cache:'no-cache',credentials:'same-origin'}):fetch(r);
  e.respondWith(rete.then(res=>{
    if(res.ok){const copia=res.clone();caches.open(CACHE).then(c=>c.put(r,copia))}
    return res;
  }).catch(async()=>(await caches.match(r,{ignoreSearch:true}))||(await caches.match('./index.html',{ignoreSearch:true}))||(await caches.match('./',{ignoreSearch:true}))||Response.error()));
});
