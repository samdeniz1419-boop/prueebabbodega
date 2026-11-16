// Bodega · permite abrir la app sin internet (guarda la página y las fotos ya vistas)
const V = 'bodega-app-v25', IMG = 'bodega-img';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./','manifest.webmanifest','icon-192.png','icon-512.png'])).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    // La página: siempre intenta la versión nueva; sin internet usa la guardada
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./') || caches.match('index.html'))));
    return;
  }
  if (/drive\.google\.com\/thumbnail|googleusercontent\.com|fonts\.(googleapis|gstatic)\.com/.test(r.url)) {
    // Fotos y letras: se guardan al verlas para poder verlas otra vez sin internet
    e.respondWith(caches.open(IMG).then(async c => {
      const m = await c.match(r);
      const net = fetch(r).then(res => {
        if (res.ok || res.type === 'opaque') { c.put(r, res.clone()); c.keys().then(ks => { if (ks.length > 600) c.delete(ks[0]); }); }
        return res;
      }).catch(() => m);
      return m || net;
    }));
  }
});

// Avisos de pedidos (el servidor manda un aviso sin texto; aquí se muestra el mensaje)
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('Multipart Bodega', {
    body: 'Tienes un pedido nuevo. Toca para verlo.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'pedido-nuevo', renotify: true, vibrate: [200, 100, 200], data: { ir: 'pedidos' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ ir: 'pedidos' }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + '?ir=pedidos');
  }));
});
