import lucide from '@iconify-json/lucide/icons.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  compatibilityDate: '2026-06-30',
  css: [
    '~/assets/css/main.css',
  ],

  devtools: {
    enabled: true,
  },
  eslint: {
    config: {
      autoInit: false,
      standalone: false,
    },
  },
  icon: {
    clientBundle: {
      icons: Object.keys(lucide.icons).map((name) => `lucide:${name}`),
      sizeLimitKb: 4096,
    },
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@vueuse/nuxt',
  ],
  nitro: {
    preset: 'vercel',
  },
  routeRules: {
    '/**': {
      headers: {
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
  },

  ssr: false,

})
