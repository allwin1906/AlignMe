import { registerSW } from 'virtual:pwa-register'

/** Service workers need a secure context: HTTPS, or localhost during development. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  registerSW({ immediate: true })
}
