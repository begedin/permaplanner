import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 8080;

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const OAUTH_PATH = '/api/github/oauth/access_token';

const stripEnvQuotes = (value) => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const t = String(value).trim().replace(/^["']+|["']+$/g, '');
  return t || undefined;
};

const contentType = (filePath) => {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
};

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const resolveUnderDist = (pathname) => {
  const rel = pathname === '/' || pathname === '' ? 'index.html' : pathname.slice(1);
  const resolved = path.resolve(path.join(dist, rel));
  if (!resolved.startsWith(path.resolve(dist))) {
    return null;
  }
  return resolved;
};

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (req.method === 'POST' && url.pathname === OAUTH_PATH) {
        const bodyBuf = await readRequestBody(req);
        const params = new URLSearchParams(bodyBuf.toString('utf8'));
        const secret = stripEnvQuotes(process.env.GITHUB_CLIENT_SECRET);
        if (secret) {
          params.set('client_secret', secret);
        }
        const ghRes = await fetch(GITHUB_TOKEN_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const text = await ghRes.text();
        const ct = ghRes.headers.get('content-type') || 'application/json; charset=utf-8';
        res.writeHead(ghRes.status, { 'Content-Type': ct });
        res.end(text);
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end();
        return;
      }

      let filePath = resolveUnderDist(url.pathname);
      if (!filePath) {
        res.writeHead(403).end();
        return;
      }

      try {
        const st = await fs.stat(filePath);
        if (!st.isFile()) {
          throw new Error('not a file');
        }
      } catch {
        filePath = path.join(dist, 'index.html');
      }

      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (e) {
      console.error('[permaplanner static]', e);
      if (!res.headersSent) {
        res.writeHead(500).end('Internal Server Error');
      }
    }
  })
  .listen(PORT, () => {
    console.log(`[permaplanner] serving dist on port ${PORT}`);
  });
