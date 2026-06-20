// Service Worker - Ma Collection Rugby
const CACHE = 'rugby-v11';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
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
  // Cache-first for app shell + images
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        // Cache Supabase storage images
        if(url.indexOf('/storage/') >= 0 && resp.ok){
          var clone = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
