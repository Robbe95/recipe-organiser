export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  void navigator.serviceWorker.register('/sw.js', {
    scope: '/kitchen',
  })
})
