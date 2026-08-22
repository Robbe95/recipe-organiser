import { projectConfig } from '@wisemen/eslint-config-vue'

import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  ...(await projectConfig()),
  {
    ignores: [
      '**/layers/base/components/core/sonner/Toaster.vue',
      '.nuxt/*',
      'node_modules/*',
      '.nuxtrc',
      'drizzle/*',
      '.vscode/*',
      '.repos/*',
      '**/*.xlsx',
      './layers/marketplace/client/**',
      '**/*.toml',
    ],
  },

  {
    rules: {
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: [
            'dark',
            'light',
            '^custom-(?:\\S+)?$',
          ],
        },
      ],
      'e18e/prefer-static-regex': 'off',
      'eslint-plugin-wisemen/explicit-function-return-type-with-regex': 'off',
      'eslint-plugin-wisemen/vue-computed-ref-generics': 'off',
      'node/prefer-global/process': 'off',
      'project-structure/independent-modules': 'off',
      'ts/explicit-function-return-type': 'off',
      'vue/no-undef-components': 'off',
    },
  },
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
      },
    },
  },
)
