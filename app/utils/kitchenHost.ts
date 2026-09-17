/** The standalone Kitchen PWA entry point. */
export function isKitchenHost(hostname: string) {
  return hostname.toLocaleLowerCase() === 'kitchen.robbevaes.com'
}
