import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      reporter: process.env.GITHUB_ACTIONS
        ? ['text', 'html', 'github-actions']
        : ['text', 'json-summary', 'json', 'html'],
      reportOnFailure: true,
    },
  },
});
