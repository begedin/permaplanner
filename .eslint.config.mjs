import '@rushstack/eslint-patch/modern-module-resolution'

import tseslint from 'typescript-eslint'

export default tseslint.config({
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'arrow-body-style': ['error', 'as-needed'],
    'arrow-parens': 'as-needed'
  },
  ...tseslint.configs.recommended
})
