import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      coverage: {
        reporter: ['text', 'json', 'json-summary', 'html', 'clover'],
        reportOnFailure: true,
      },
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: [
        './src/testing/vitestSetup.ts',
        './src/testing/vitestGardensApiMock.ts',
      ],
    },
  }),
);
