import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { codecovRollupPlugin } from '@codecov/rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const phoenixDevUrl = process.env.PHOENIX_DEV_URL ?? 'http://127.0.0.1:8080';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    {
      name: 'check-lfs-icons',
      apply: 'build',
      configResolved({ publicDir }) {
        const icons = globSync(['favicon.ico', 'icons/*.{png,svg}'], { cwd: publicDir });
        for (const icon of icons) {
          const data = readFileSync(join(publicDir, icon), 'utf8');
          if (data.startsWith('version https://git-lfs.github.com/spec/v1')) {
            throw new Error(
              `${icon} is a Git LFS pointer. Run "git lfs pull" before building.`,
            );
          }
        }
      },
    },
    vue(),
    tailwindcss(),
    codecovRollupPlugin({
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
      '/admin': phoenixDevUrl,
      '/live': { target: phoenixDevUrl, ws: true },
      '/api': phoenixDevUrl,
      '/share': phoenixDevUrl,
      '/sandbox': phoenixDevUrl,
    },
  },
  preview: {
    proxy: {
      '/admin': phoenixDevUrl,
      '/live': { target: phoenixDevUrl, ws: true },
      '/api': phoenixDevUrl,
      '/share': phoenixDevUrl,
      '/sandbox': phoenixDevUrl,
    },
  },
});
