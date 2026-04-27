import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import vue from '@vitejs/plugin-vue';

const stripEnvQuotes = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const t = value.trim();
  if (!t) {
    return undefined;
  }
  return t.replace(/^["']+|["']+$/g, '') || undefined;
};

const readGithubOAuthBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const forwardGithubTokenRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const buf = await readGithubOAuthBody(req);
  const params = new URLSearchParams(buf.toString('utf8'));
  const secret = stripEnvQuotes(process.env.GITHUB_CLIENT_SECRET);
  if (secret) {
    params.set('client_secret', secret);
  }
  const ghRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await ghRes.text();
  res.statusCode = ghRes.status;
  res.setHeader(
    'Content-Type',
    ghRes.headers.get('content-type') ?? 'application/json; charset=utf-8',
  );
  res.end(text);
};

const githubOAuthTokenProxyPlugin = (): Plugin => {
  const attach = (server: ViteDevServer | PreviewServer): void => {
    server.middlewares.use((req, res, next) => {
      const pathOnly = (req.url ?? '').split('?')[0];
      if (pathOnly !== '/api/github/oauth/access_token' || req.method !== 'POST') {
        next();
        return;
      }
      void (async () => {
        try {
          await forwardGithubTokenRequest(req, res);
        } catch (e) {
          console.error('[permaplanner] GitHub OAuth token proxy failed:', e);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                error: 'oauth_token_proxy_failed',
                error_description: String(e),
              }),
            );
          }
        }
      })();
    });
  };

  return {
    name: 'permaplanner-github-oauth-token-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    githubOAuthTokenProxyPlugin(),
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
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'json-summary', 'html', 'clover'],
      reportOnFailure: true,
    },
  },
});
