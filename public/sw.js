const CACHE = 'kitchen-shell-v1'
const SHELL = [
  '/kitchen',
  '/manifest.webmanifest',
  '/kitchen-icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const isCacheableAsset = [
    'font',
    'image',
    'script',
    'style',
  ].includes(event.request.destination)
  const isNavigation = event.request.mode === 'navigate'

  if (event.request.method !== 'GET' || (!isCacheableAsset && !isNavigation)) return

  event.respondWith(fetch(event.request)
    .then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone()
        void caches.open(CACHE).then((cache) => cache.put(event.request, copy))
      }
      return response
    })
    .catch(async () => (await caches.match(event.request)) || caches.match('/kitchen')))
})
