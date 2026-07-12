import { fileURLToPath, URL } from 'node:url';
import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const phoenixDevUrl = process.env.PHOENIX_DEV_URL ?? 'http://127.0.0.1:8080';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    vue(),
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: 'Permaplanner',
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': phoenixDevUrl,
      '/share': phoenixDevUrl,
    },
  },
  preview: {
    proxy: {
      '/api': phoenixDevUrl,
      '/share': phoenixDevUrl,
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'json-summary', 'html', 'clover'],
      reportOnFailure: true,
    },
  },
});
