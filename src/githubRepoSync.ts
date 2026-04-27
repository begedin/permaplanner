import type { PermaplannerFileV1 } from './usePermaplannerStore';

export const planRepoSyncUpdatedEventName = 'permaplanner:plan-repo-updated';

/** Normalizes Vite env (trim + strip wrapping quotes from dotenv / 1Password). */
export const readGithubClientIdConfig = (): string | undefined => {
  const raw = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const t = raw.trim().replace(/^["']+|["']+$/g, '');
  return t || undefined;
};

const REPO_NAME = 'permaplanner-plan-sync';
const DEFAULT_BRANCH = 'main';
const PLANS_DIR = 'plans';

const SS_VERIFIER = 'permaplanner.oauth.github.code_verifier';
const SS_STATE = 'permaplanner.oauth.github.state';
const SS_TOKEN = 'permaplanner.github.accessToken';
const LS_REPO_FULL_NAME = 'permaplanner.github.planRepoFullName';

const GITHUB_AUTH = 'https://github.com/login/oauth/authorize';
const githubOAuthTokenPath = () => '/api/github/oauth/access_token';

export const githubRepoRedirectPath = () => '/garden';

const redirectUri = () => `${window.location.origin}${githubRepoRedirectPath()}`;

const base64Url = (buf: ArrayBuffer): string => {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomBase64Url = (bytes: number): string => {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return base64Url(a.buffer);
};

const sha256Base64Url = async (plain: string): Promise<string> => {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64Url(hash);
};

/** OAuth scope: create/update a private repo and file via Contents API (not gist). */
const OAUTH_SCOPE = 'repo';

export const buildGithubAuthorizeUrl = (params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string => {
  const u = new URL(GITHUB_AUTH);
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('redirect_uri', params.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', OAUTH_SCOPE);
  u.searchParams.set('state', params.state);
  u.searchParams.set('code_challenge', params.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('allow_signup', 'true');
  return u.toString();
};

export const getGithubAccessToken = (): string | undefined =>
  sessionStorage.getItem(SS_TOKEN) ?? undefined;

export const planPathSegment = (fileName: string | undefined): string => {
  const raw = (fileName ?? 'plan.json').trim() || 'plan.json';
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'plan.json';
  const withExt = safe.toLowerCase().endsWith('.json') ? safe : `${safe}.json`;
  return withExt.slice(0, 180);
};

/** Folder name under `plans/` for one garden (derived from the local plan file name). */
export const planGardenFolderSegment = (fileName: string | undefined): string => {
  const stem = planPathSegment(fileName).replace(/\.json$/i, '').slice(0, 120);
  return stem || 'plan';
};

const gardenDir = (fileName: string | undefined): string =>
  `${PLANS_DIR}/${planGardenFolderSegment(fileName)}`;

/** `plans/<garden>/plants.json` */
export const planRepoPlantsPath = (fileName: string | undefined): string =>
  `${gardenDir(fileName)}/plants.json`;

/** `plans/<garden>/guilds.json` */
export const planRepoGuildsPath = (fileName: string | undefined): string =>
  `${gardenDir(fileName)}/guilds.json`;

/** `plans/<garden>/config.json` (version, map scale, background metadata). */
export const planRepoConfigPath = (fileName: string | undefined): string =>
  `${gardenDir(fileName)}/config.json`;

/** Background image path in the same garden folder (Contents API = normal git blob, not LFS). */
export const planBackgroundMediaRepoPath = (fileName: string | undefined, ext: string): string =>
  `${PLANS_DIR}/${planGardenFolderSegment(fileName)}/background.${ext}`;

export const getPlanRepoBlobUrl = (fileName: string | undefined): string | undefined => {
  const full = localStorage.getItem(LS_REPO_FULL_NAME);
  if (!full) {
    return undefined;
  }
  const path = planRepoConfigPath(fileName);
  return `https://github.com/${full}/blob/${DEFAULT_BRANCH}/${path}`;
};

export const clearGithubRepoSession = (): void => {
  sessionStorage.removeItem(SS_TOKEN);
  sessionStorage.removeItem(SS_VERIFIER);
  sessionStorage.removeItem(SS_STATE);
  localStorage.removeItem(LS_REPO_FULL_NAME);
  localStorage.removeItem('permaplanner.github.gistId');
  localStorage.removeItem('permaplanner.github.gistHtmlUrl');
};

export const beginGithubAuth = async (): Promise<void> => {
  const clientId = readGithubClientIdConfig();
  if (!clientId) {
    return;
  }
  const codeVerifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  sessionStorage.setItem(SS_VERIFIER, codeVerifier);
  sessionStorage.setItem(SS_STATE, state);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  window.location.href = buildGithubAuthorizeUrl({
    clientId,
    redirectUri: redirectUri(),
    state,
    codeChallenge,
  });
};

const stripOAuthParamsFromUrl = (): void => {
  const u = new URL(window.location.href);
  if (!u.searchParams.has('code') && !u.searchParams.has('state')) {
    return;
  }
  u.searchParams.delete('code');
  u.searchParams.delete('state');
  window.history.replaceState({}, '', u.pathname + u.search + u.hash);
};

type TokenResponse =
  | { access_token: string; token_type?: string; scope?: string }
  | { error: string; error_description?: string };

export const completeGithubAuthIfNeeded = async (): Promise<
  'connected' | 'noop' | 'error'
> => {
  const clientId = readGithubClientIdConfig();
  if (!clientId) {
    return 'noop';
  }
  const u = new URL(window.location.href);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (!code || !state) {
    return 'noop';
  }
  const expectedState = sessionStorage.getItem(SS_STATE);
  const verifier = sessionStorage.getItem(SS_VERIFIER);
  if (!expectedState || !verifier || state !== expectedState) {
    stripOAuthParamsFromUrl();
    return 'error';
  }

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });

  let json: TokenResponse;
  try {
    const res = await fetch(githubOAuthTokenPath(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    json = (await res.json()) as TokenResponse;
  } catch (e) {
    console.error('[permaplanner] GitHub token request failed:', e);
    sessionStorage.removeItem(SS_VERIFIER);
    sessionStorage.removeItem(SS_STATE);
    stripOAuthParamsFromUrl();
    return 'error';
  }

  sessionStorage.removeItem(SS_VERIFIER);
  sessionStorage.removeItem(SS_STATE);

  if ('error' in json) {
    console.error(
      '[permaplanner] GitHub token error:',
      json.error,
      json.error_description,
    );
    stripOAuthParamsFromUrl();
    return 'error';
  }

  sessionStorage.setItem(SS_TOKEN, json.access_token);
  stripOAuthParamsFromUrl();
  return 'connected';
};

const githubHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

const utf8ToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
};

const mimeToImageExt = (mime: string): string => {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? '';
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return 'png';
};

/** Parses a data URL; returns RFC 4648 base64 for the GitHub Contents API body. */
const decodeDataUrlImageForRepo = (
  dataUrl: string,
): { standardBase64: string; ext: string } | null => {
  const trimmed = dataUrl.trim();
  const m = /^data:([^,]+),(.+)$/i.exec(trimmed);
  if (!m) {
    return null;
  }
  const header = (m[1] ?? '').trim();
  const payload = (m[2] ?? '').replace(/\s/g, '');
  if (!payload) {
    return null;
  }
  if (!header.toLowerCase().includes(';base64')) {
    return null;
  }
  const mime = header.split(';')[0]?.trim() ?? 'image/png';
  const pad = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4));
  try {
    atob(payload + pad);
  } catch {
    return null;
  }
  return { standardBase64: payload + pad, ext: mimeToImageExt(mime) };
};

const ensurePlanRepo = async (token: string): Promise<string> => {
  const cached = localStorage.getItem(LS_REPO_FULL_NAME);
  if (cached) {
    return cached;
  }

  const userRes = await fetch('https://api.github.com/user', { headers: githubHeaders(token) });
  if (!userRes.ok) {
    const t = await userRes.text();
    throw new Error(`GitHub user: ${userRes.status} ${t}`);
  }
  const user = (await userRes.json()) as { login: string };
  const login = user.login;

  const existing = await fetch(`https://api.github.com/repos/${login}/${REPO_NAME}`, {
    headers: githubHeaders(token),
  });
  if (existing.ok) {
    const repo = (await existing.json()) as { full_name: string };
    localStorage.setItem(LS_REPO_FULL_NAME, repo.full_name);
    return repo.full_name;
  }

  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: REPO_NAME,
      private: true,
      description: 'Permaplanner synced garden plans (JSON files)',
      auto_init: true,
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`GitHub create repo: ${createRes.status} ${errText}`);
  }
  const repo = (await createRes.json()) as { full_name: string };
  localStorage.setItem(LS_REPO_FULL_NAME, repo.full_name);
  return repo.full_name;
};

type ContentGetResponse = { sha: string; type: string };

/**
 * Creates or updates a single file via the Contents API (normal git blob).
 * Git LFS is not supported here — LFS uses a separate upload + pointer-file flow.
 */
const putRepoContents = async (
  token: string,
  fullName: string,
  path: string,
  contentBase64: string,
  message: string,
): Promise<void> => {
  const url = `https://api.github.com/repos/${fullName}/contents/${path}`;
  const getRes = await fetch(`${url}?ref=${DEFAULT_BRANCH}`, { headers: githubHeaders(token) });
  let sha: string | undefined;
  if (getRes.ok) {
    const meta = (await getRes.json()) as ContentGetResponse;
    if (meta.type === 'file' && meta.sha) {
      sha = meta.sha;
    }
  } else if (getRes.status !== 404) {
    const t = await getRes.text();
    throw new Error(`GitHub read ${path}: ${getRes.status} ${t}`);
  }

  const body: { message: string; content: string; branch: string; sha?: string } = {
    message,
    content: contentBase64,
    branch: DEFAULT_BRANCH,
  };
  if (sha) {
    body.sha = sha;
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub write ${path}: ${putRes.status} ${errText}`);
  }
};

export const pushPlanJsonToGithubRepo = async (
  token: string,
  snapshot: PermaplannerFileV1,
  sourceFileName: string | undefined,
): Promise<void> => {
  const fullName = await ensurePlanRepo(token);
  const bg = snapshot.backgroundImage;

  let backgroundImagePath: string | undefined;
  if (typeof bg === 'string' && bg.startsWith('data:')) {
    const img = decodeDataUrlImageForRepo(bg);
    if (img) {
      const mediaPath = planBackgroundMediaRepoPath(sourceFileName, img.ext);
      await putRepoContents(
        token,
        fullName,
        mediaPath,
        img.standardBase64,
        `Update plan background (${mediaPath})`,
      );
      backgroundImagePath = mediaPath;
    }
  }

  const segment = planGardenFolderSegment(sourceFileName);
  const plantsJson = JSON.stringify({ plants: snapshot.plants }, null, 2);
  const guildsJson = JSON.stringify({ guilds: snapshot.guilds }, null, 2);
  const configJson = JSON.stringify(
    {
      version: snapshot.version,
      mapScale: snapshot.mapScale,
      backgroundOpacity: snapshot.backgroundOpacity,
      ...(backgroundImagePath !== undefined ? { backgroundImagePath } : {}),
    },
    null,
    2,
  );

  const plantsPath = planRepoPlantsPath(sourceFileName);
  const guildsPath = planRepoGuildsPath(sourceFileName);
  const configPath = planRepoConfigPath(sourceFileName);

  await putRepoContents(
    token,
    fullName,
    plantsPath,
    utf8ToBase64(plantsJson),
    `Update plan plants (${segment})`,
  );
  await putRepoContents(
    token,
    fullName,
    guildsPath,
    utf8ToBase64(guildsJson),
    `Update plan guilds (${segment})`,
  );
  await putRepoContents(
    token,
    fullName,
    configPath,
    utf8ToBase64(configJson),
    `Update plan config (${segment})`,
  );
};

export const syncIfRepoLinked = async (
  snapshot: PermaplannerFileV1,
  sourceFileName: string | undefined,
): Promise<void> => {
  if (!readGithubClientIdConfig()) {
    return;
  }
  const token = getGithubAccessToken();
  if (!token) {
    return;
  }
  try {
    await pushPlanJsonToGithubRepo(token, snapshot, sourceFileName);
    window.dispatchEvent(new Event(planRepoSyncUpdatedEventName));
  } catch (e) {
    console.error('[permaplanner] GitHub repo sync failed:', e);
  }
};
