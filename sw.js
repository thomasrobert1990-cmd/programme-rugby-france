// Service Worker - Ma Collection Rugby
const CACHE = 'rugby-v31';
const IMG_CACHE = 'rugby-img-v1'; // images conservées d'une version à l'autre
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  // cache:'reload' = ignore le cache HTTP du navigateur (sinon on peut remettre l'ancienne page en cache)
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS.map(function(u){ return new Request(u, {cache:'reload'}); })); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE && k !== IMG_CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  // Network-first for Supabase API (always fresh data)
  if(url.indexOf('supabase.co') >= 0){
    e.respondWith(
      fetch(e.request).catch(function(){ return caches.match(e.request); })
    );
    return;
  }
  // Network-first pour la page elle-même : toujours la dernière version si on est en ligne
  if(e.request.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(url.replace(self.registration.scope,'/'))){
    e.respondWith(
      fetch(e.request, {cache:'no-cache'}).then(function(resp){
        if(resp.ok){ var cl = resp.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cl); }); }
        return resp;
      }).catch(function(){ return caches.match(e.request).then(function(r){ return r || caches.match('./index.html'); }); })
    );
    return;
  }
  // Cache-first for images + other assets
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        // Cache Supabase storage images
        if(url.indexOf('/storage/') >= 0 && resp.ok){
          var clone = resp.clone();
          caches.open(IMG_CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
