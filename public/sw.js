// Service Worker for DrunkRace Push Notifications
// v2 — cache bust
const CACHE_VERSION = 'v' + Date.now()

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(keys.map(k => caches.delete(k)))
  ).then(() => clients.claim())
))

self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  const title = data.title || '📸 DrunkRace'
  const options = {
    body: data.body || 'BeDrunk ! Prends ta photo !',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '📷 Prendre ma photo' }
    ],
    requireInteraction: true,
    tag: data.tag || 'bedrunk',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
