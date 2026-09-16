import lucide from '@iconify-json/lucide/icons.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  compatibilityDate: '2026-06-30',

  app: {
    head: {
      link: [
        {
          href: '/manifest.webmanifest',
          rel: 'manifest',
        },
        {
          href: '/kitchen-icon.svg',
          rel: 'apple-touch-icon',
        },
      ],
      meta: [
        {
          name: 'theme-color',
          content: '#ffffff',
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'default',
        },
      ],
    },
    viewTransition: false,
  },
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
  experimental: {
    viewTransition: true,
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
  runtimeConfig: {
    public: {
      localLoginEmail: process.env.NODE_ENV === 'development' ? process.env.LOCAL_LOGIN_EMAIL || '' : '',
      localLoginPassword: process.env.NODE_ENV === 'development' ? process.env.LOCAL_LOGIN_PASSWORD || '' : '',
    },
  },

  ssr: false,

})
