import { ref } from 'vue';

import planGardenViewerTemplate from '../public/plan-garden-viewer.template.html?raw';
import { buildGithubPlanShardExports } from './permaplannerFileExport';
import { renderPlanGardenViewerHtml } from './planGardenViewer';
import {
  documentNeedsMigration,
  guildsArrayFromShard,
  migratePlanDocumentRaw,
  plantsArrayFromShard,
  readDocumentVersion,
} from './permaplannerFileMigrate';
import type { GithubShardMigrationVersions } from './permaplannerFileMigrate';
import {
  parsePermaplannerDocument,
  type PermaplannerFileV1,
} from './usePermaplannerStore';

export const planRepoSyncUpdatedEventName = 'permaplanner:plan-repo-updated';

/** Incremented around `pushPlanJsonToGithubRepo` (manual push + `syncIfRepoLinked` after save). */
export const githubRepoPushInFlightCount = ref(0);

/** Set when a background sync after save fails; cleared on the next successful push. */
export const githubRepoLastSyncError = ref<string | undefined>();
/** Most recent known remote commit timestamp (from push response or optimistic fallback). */
export const githubRepoRemoteLastUpdatedMs = ref<number | undefined>();

export type GithubSyncFailureKind = 'conflict' | 'auth' | 'rejected' | 'generic';

export class GithubSyncError extends Error {
  readonly status: number;
  readonly path: string;
  readonly kind: GithubSyncFailureKind;

  constructor(
    message: string,
    opts: { status: number; path: string; kind: GithubSyncFailureKind },
  ) {
    super(message);
    this.name = 'GithubSyncError';
    this.status = opts.status;
    this.path = opts.path;
    this.kind = opts.kind;
  }
}

const githubSyncFailureKind = (status: number): GithubSyncFailureKind => {
  if (status === 409) {
    return 'conflict';
  }
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 422) {
    return 'rejected';
  }
  return 'generic';
};

/** User-facing message for GitHub Contents API failures (not raw JSON bodies). */
export const githubSyncUserMessage = (
  operation: 'read' | 'write',
  path: string,
  status: number,
  bodyText: string,
): string => {
  if (status === 409) {
    return 'GitHub was updated while saving your plan. Push again to overwrite with your local copy.';
  }
  if (status === 404) {
    return operation === 'write'
      ? 'GitHub could not find the plan repo or branch. Disconnect and connect GitHub again, or check that the backup repo still exists.'
      : `Could not read "${path}" from GitHub (not found).`;
  }
  if (status === 401 || status === 403) {
    return 'GitHub access expired or was denied. Disconnect and connect GitHub again.';
  }
  if (status === 422) {
    return 'GitHub rejected this update. The file may be too large; try a smaller background image.';
  }
  try {
    const api = JSON.parse(bodyText) as { message?: string };
    if (typeof api.message === 'string' && api.message.trim()) {
      return api.message;
    }
  } catch {
    /* ignore */
  }
  return operation === 'write'
    ? `Could not upload "${path}" to GitHub (${status}).`
    : `Could not read "${path}" from GitHub (${status}).`;
};

const failGithubSync = (
  operation: 'read' | 'write',
  path: string,
  status: number,
  bodyText: string,
): never => {
  const message = githubSyncUserMessage(operation, path, status, bodyText);
  throw new GithubSyncError(message, {
    status,
    path,
    kind: githubSyncFailureKind(status),
  });
};

/** Normalizes Vite env (trim + strip wrapping quotes from dotenv / 1Password). */
export const readGithubClientIdConfig = (): string | undefined => {
  const raw = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const t = raw.trim().replace(/^["']+|["']+$/g, '');
  return t || undefined;
};

/** Fixed slug for the private backup repo under the signed-in GitHub user. */
export const GITHUB_PLAN_SYNC_REPO_NAME = 'permaplanner-plan-sync';
const DEFAULT_BRANCH = 'main';
const PLANS_DIR = 'plans';

const SS_VERIFIER = 'permaplanner.oauth.github.code_verifier';
const SS_STATE = 'permaplanner.oauth.github.state';
const SS_TOKEN = 'permaplanner.github.accessToken';
const LS_REPO_FULL_NAME = 'permaplanner.github.planRepoFullName';
const LS_REMOTE_LAST_UPDATED_BY_GARDEN = 'permaplanner.github.remoteLastUpdatedByGarden';

const GITHUB_AUTH = 'https://github.com/login/oauth/authorize';
const githubOAuthTokenPath = () => '/api/github/oauth/access_token';

export const githubRepoRedirectPath = () => '/guilds';

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

export const isGithubStorageLinked = (): boolean => Boolean(getGithubAccessToken());

export const planPathSegment = (fileName: string | undefined): string => {
  const raw = (fileName ?? 'plan.json').trim() || 'plan.json';
  const safe =
    raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'plan.json';
  const withExt = safe.toLowerCase().endsWith('.json') ? safe : `${safe}.json`;
  return withExt.slice(0, 180);
};

/** Folder name under `plans/` for one garden (derived from the local plan file name). */
export const planGardenFolderSegment = (fileName: string | undefined): string => {
  const stem = planPathSegment(fileName)
    .replace(/\.json$/i, '')
    .slice(0, 120);
  return stem || 'plan';
};

const readRemoteLastUpdatedByGardenMap = (): Record<string, number> => {
  const raw = localStorage.getItem(LS_REMOTE_LAST_UPDATED_BY_GARDEN);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
};

const writeRemoteLastUpdatedByGardenMap = (map: Record<string, number>): void => {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(LS_REMOTE_LAST_UPDATED_BY_GARDEN);
    return;
  }
  localStorage.setItem(LS_REMOTE_LAST_UPDATED_BY_GARDEN, JSON.stringify(map));
};

const readPersistedGithubRepoRemoteLastUpdatedMs = (
  sourceFileName: string | undefined,
): number | undefined => {
  const ms = readRemoteLastUpdatedByGardenMap()[planGardenFolderSegment(sourceFileName)];
  return ms !== undefined && Number.isFinite(ms) ? ms : undefined;
};

/** Restore cached remote timestamp for the current garden (survives page refresh). */
export const loadGithubRepoRemoteLastUpdatedMs = (
  sourceFileName: string | undefined,
): void => {
  githubRepoRemoteLastUpdatedMs.value =
    readPersistedGithubRepoRemoteLastUpdatedMs(sourceFileName);
};

/** Remember the latest known remote timestamp for a garden (never moves backward). */
export const noteGithubRepoRemoteLastUpdatedMs = (
  sourceFileName: string | undefined,
  ms: number | undefined,
): void => {
  if (ms === undefined || !Number.isFinite(ms)) {
    return;
  }
  const gardenKey = planGardenFolderSegment(sourceFileName);
  const map = readRemoteLastUpdatedByGardenMap();
  const prev = map[gardenKey];
  const next = prev !== undefined ? Math.max(prev, ms) : ms;
  map[gardenKey] = next;
  writeRemoteLastUpdatedByGardenMap(map);
  const current = githubRepoRemoteLastUpdatedMs.value;
  githubRepoRemoteLastUpdatedMs.value =
    current !== undefined ? Math.max(current, next) : next;
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

/** `plans/<garden>/viewer.html` */
export const planRepoGardenViewerPath = (fileName: string | undefined): string =>
  `${gardenDir(fileName)}/viewer.html`;

/** Background image path in the same garden folder (Contents API = normal git blob, not LFS). */
export const planBackgroundMediaRepoPath = (
  fileName: string | undefined,
  ext: string,
): string => `${PLANS_DIR}/${planGardenFolderSegment(fileName)}/background.${ext}`;

/** Web URL for the `plans/<garden>/` folder on GitHub (not a single file). */
export const getPlanRepoGardenFolderUrl = (
  fileName: string | undefined,
): string | undefined => {
  const full = localStorage.getItem(LS_REPO_FULL_NAME);
  if (!full) {
    return undefined;
  }
  const path = gardenDir(fileName);
  return `https://github.com/${full}/tree/${DEFAULT_BRANCH}/${path}`;
};

const planRepoGithubPagesBaseUrl = (fullName: string): string => {
  const [ownerRaw, repoRaw] = fullName.split('/');
  const owner = ownerRaw?.trim();
  const repo = repoRaw?.trim();
  if (!owner || !repo) {
    return '';
  }
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io`;
  }
  return `https://${owner}.github.io/${repo}`;
};

/** GitHub Pages URL for a static per-garden viewer page. */
export const getPlanRepoGardenViewerUrl = (
  fileName: string | undefined,
): string | undefined => {
  const full = localStorage.getItem(LS_REPO_FULL_NAME);
  if (!full) {
    return undefined;
  }
  const base = planRepoGithubPagesBaseUrl(full);
  if (!base) {
    return undefined;
  }
  return `${base}/${planRepoGardenViewerPath(fileName)}`;
};

export const clearGithubRepoSession = (): void => {
  sessionStorage.removeItem(SS_TOKEN);
  sessionStorage.removeItem(SS_VERIFIER);
  sessionStorage.removeItem(SS_STATE);
  localStorage.removeItem(LS_REPO_FULL_NAME);
  localStorage.removeItem('permaplanner.github.gistId');
  localStorage.removeItem('permaplanner.github.gistHtmlUrl');
  githubRepoRemoteLastUpdatedMs.value = undefined;
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

/** Parses a data URL; returns RFC 4648 base64 for the GitHub Git blobs API. */
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

  const userRes = await fetch('https://api.github.com/user', {
    headers: githubHeaders(token),
  });
  if (!userRes.ok) {
    const t = await userRes.text();
    throw new Error(`GitHub user: ${userRes.status} ${t}`);
  }
  const user = (await userRes.json()) as { login: string };
  const login = user.login;

  const existing = await fetch(
    `https://api.github.com/repos/${login}/${GITHUB_PLAN_SYNC_REPO_NAME}`,
    {
      headers: githubHeaders(token),
    },
  );
  if (existing.ok) {
    const repo = (await existing.json()) as { full_name: string };
    localStorage.setItem(LS_REPO_FULL_NAME, repo.full_name);
    return repo.full_name;
  }

  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: GITHUB_PLAN_SYNC_REPO_NAME,
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

type ContentFileApi = {
  type: string;
  sha?: string;
  content?: string | null;
  encoding?: string;
};

type GithubCommitDateCarrier = {
  commit?: {
    committer?: { date?: string };
    author?: { date?: string };
  };
};

/** ISO commit timestamp from a list-commits entry or Contents create/update response. */
export const readGithubCommitDateMs = (body: unknown): number | undefined => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const commit = (body as GithubCommitDateCarrier).commit;
  const dateStr = commit?.committer?.date ?? commit?.author?.date;
  if (typeof dateStr !== 'string') {
    return undefined;
  }
  const ms = Date.parse(dateStr);
  return Number.isFinite(ms) ? ms : undefined;
};

const fetchLatestCommitDateMsForRepoPath = async (
  token: string,
  fullName: string,
  path: string,
): Promise<number | undefined> => {
  const url = `https://api.github.com/repos/${fullName}/commits?path=${encodeURIComponent(path)}&per_page=1&sha=${DEFAULT_BRANCH}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    const t = await res.text();
    failGithubSync('read', path, res.status, t);
  }
  const list = (await res.json()) as unknown;
  if (!Array.isArray(list) || list.length === 0) {
    return undefined;
  }
  return readGithubCommitDateMs(list[0]);
};

const decodeGithubFileBase64 = (content: string): Uint8Array => {
  const b64 = content.replace(/\s/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
};

/**
 * GitHub omits inline `content` for files above ~1 MB. `raw.githubusercontent.com` URLs are not
 * fetchable from the browser (no CORS), so large files are loaded via the Git Blobs API instead.
 */
const fetchGithubRepoFileBytes = async (
  token: string,
  fullName: string,
  file: ContentFileApi,
): Promise<Uint8Array> => {
  if (file.encoding === 'base64' && typeof file.content === 'string') {
    return decodeGithubFileBase64(file.content);
  }
  const sha = typeof file.sha === 'string' ? file.sha : '';
  if (!sha) {
    throw new Error('GitHub file response has no base64 content and no blob sha');
  }
  const url = `https://api.github.com/repos/${fullName}/git/blobs/${sha}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub blob read: ${res.status} ${t}`);
  }
  return new Uint8Array(await res.arrayBuffer());
};

const uint8ArrayToStandardBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

const getRepoContentsFile = async (
  token: string,
  fullName: string,
  path: string,
): Promise<ContentFileApi | undefined> => {
  const url = `https://api.github.com/repos/${fullName}/contents/${path}?ref=${DEFAULT_BRANCH}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    const t = await res.text();
    failGithubSync('read', path, res.status, t);
  }
  const body = (await res.json()) as ContentFileApi;
  if (body.type !== 'file') {
    throw new Error(`GitHub read ${path}: unexpected response shape`);
  }
  const hasInlineBase64 = body.encoding === 'base64' && typeof body.content === 'string';
  const hasBlobSha = typeof body.sha === 'string' && body.sha.length > 0;
  if (!hasInlineBase64 && !hasBlobSha) {
    throw new Error(`GitHub read ${path}: unexpected response shape`);
  }
  return body;
};

const getRepoJsonIfExists = async (
  token: string,
  fullName: string,
  path: string,
): Promise<unknown | undefined> => {
  const file = await getRepoContentsFile(token, fullName, path);
  if (!file) {
    return undefined;
  }
  const bytes = await fetchGithubRepoFileBytes(token, fullName, file);
  if (bytes.length === 0) {
    return undefined;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
};

type GitPlanBlobFile = {
  path: string;
  contentBase64: string;
};

type GitBranchHead = {
  commitSha: string;
  treeSha: string;
};

type GitTreeEntry = {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
};

const gitApiUrl = (fullName: string, suffix: string): string =>
  `https://api.github.com/repos/${fullName}/git/${suffix}`;

/** GitHub `git/ref/{ref}` and `git/refs/{ref}` paths use `heads/branch`, not `refs/heads/branch`. */
export const gitBranchHeadRefSegment = (): string => `heads/${DEFAULT_BRANCH}`;

const getGitBranchHead = async (
  token: string,
  fullName: string,
): Promise<GitBranchHead> => {
  const refSegment = gitBranchHeadRefSegment();
  const refRes = await fetch(gitApiUrl(fullName, `ref/${refSegment}`), {
    headers: githubHeaders(token),
  });
  const refText = await refRes.text();
  if (!refRes.ok) {
    failGithubSync('read', `refs/${refSegment}`, refRes.status, refText);
  }
  const ref = JSON.parse(refText) as { object: { sha: string } };
  const commitSha = ref.object.sha;

  const commitRes = await fetch(gitApiUrl(fullName, `commits/${commitSha}`), {
    headers: githubHeaders(token),
  });
  const commitText = await commitRes.text();
  if (!commitRes.ok) {
    failGithubSync('read', commitSha, commitRes.status, commitText);
  }
  const commit = JSON.parse(commitText) as { tree: { sha: string } };
  return { commitSha, treeSha: commit.tree.sha };
};

const createGitBlob = async (
  token: string,
  fullName: string,
  contentBase64: string,
): Promise<string> => {
  const res = await fetch(gitApiUrl(fullName, 'blobs'), {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: contentBase64, encoding: 'base64' }),
  });
  const text = await res.text();
  if (!res.ok) {
    failGithubSync('write', 'git/blobs', res.status, text);
  }
  return (JSON.parse(text) as { sha: string }).sha;
};

const createGitTree = async (
  token: string,
  fullName: string,
  baseTreeSha: string,
  entries: GitTreeEntry[],
): Promise<string> => {
  const res = await fetch(gitApiUrl(fullName, 'trees'), {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
  const text = await res.text();
  if (!res.ok) {
    failGithubSync('write', 'git/trees', res.status, text);
  }
  return (JSON.parse(text) as { sha: string }).sha;
};

type GitCommitCreateResult = {
  sha: string;
  committedAtMs: number | undefined;
};

const createGitCommit = async (
  token: string,
  fullName: string,
  message: string,
  treeSha: string,
  parentCommitSha: string,
): Promise<GitCommitCreateResult> => {
  const res = await fetch(gitApiUrl(fullName, 'commits'), {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentCommitSha],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    failGithubSync('write', 'git/commits', res.status, text);
  }
  const body = JSON.parse(text) as { sha: string };
  return { sha: body.sha, committedAtMs: readGithubCommitDateMs(body) };
};

const updateGitBranchRef = async (
  token: string,
  fullName: string,
  commitSha: string,
): Promise<'ok' | 'stale'> => {
  const refSegment = gitBranchHeadRefSegment();
  const res = await fetch(gitApiUrl(fullName, `refs/${refSegment}`), {
    method: 'PATCH',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commitSha }),
  });
  if (res.ok) {
    return 'ok';
  }
  const text = await res.text();
  if (res.status === 409 || res.status === 422) {
    return 'stale';
  }
  return failGithubSync('write', `refs/${refSegment}`, res.status, text);
};

/** One commit updating all plan shard paths (local content wins on the branch tip). */
const commitPlanFilesViaGitApi = async (
  token: string,
  fullName: string,
  files: GitPlanBlobFile[],
  message: string,
): Promise<number | undefined> => {
  const refLabel = `refs/${gitBranchHeadRefSegment()}`;
  const maxAttempts = 3;

  for (let i = 0; i < maxAttempts; i++) {
    const head = await getGitBranchHead(token, fullName);
    const blobShas = await Promise.all(
      files.map((file) => createGitBlob(token, fullName, file.contentBase64)),
    );
    const treeEntries: GitTreeEntry[] = files.map((file, index) => ({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobShas[index]!,
    }));
    const treeSha = await createGitTree(token, fullName, head.treeSha, treeEntries);
    const { sha: commitSha, committedAtMs } = await createGitCommit(
      token,
      fullName,
      message,
      treeSha,
      head.commitSha,
    );
    const refResult = await updateGitBranchRef(token, fullName, commitSha);
    if (refResult === 'ok') {
      return committedAtMs;
    }
  }

  failGithubSync('write', refLabel, 409, 'Branch head changed while pushing.');
};

const backgroundRepoPathMimeByExt: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const dataUrlMimeForRepoPath = (repoPath: string): string => {
  const ext = repoPath.split('.').pop()?.toLowerCase() ?? '';
  return backgroundRepoPathMimeByExt[ext] ?? 'image/png';
};

export const scanGithubPlanShardsForMigration = async (
  token: string,
  sourceFileName: string | undefined,
): Promise<GithubShardMigrationVersions | undefined> => {
  const fullName = await ensurePlanRepo(token);
  const plantsRaw = await getRepoJsonIfExists(
    token,
    fullName,
    planRepoPlantsPath(sourceFileName),
  );
  const guildsRaw = await getRepoJsonIfExists(
    token,
    fullName,
    planRepoGuildsPath(sourceFileName),
  );
  const configRaw = await getRepoJsonIfExists(
    token,
    fullName,
    planRepoConfigPath(sourceFileName),
  );
  if (plantsRaw === undefined && guildsRaw === undefined && configRaw === undefined) {
    return undefined;
  }

  const out: GithubShardMigrationVersions = {};
  if (configRaw !== undefined && documentNeedsMigration(configRaw)) {
    out.config = readDocumentVersion(configRaw);
  }
  if (plantsRaw !== undefined && documentNeedsMigration(plantsRaw)) {
    out.plants = readDocumentVersion(plantsRaw);
  }
  if (guildsRaw !== undefined && documentNeedsMigration(guildsRaw)) {
    out.guilds = readDocumentVersion(guildsRaw);
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Latest commit time among plan shard files on GitHub (ms since epoch). */
export const fetchRemotePlanLastUpdatedMs = async (
  token: string,
  sourceFileName: string | undefined,
): Promise<number | undefined> => {
  const fullName = await ensurePlanRepo(token);
  const paths = [
    planRepoConfigPath(sourceFileName),
    planRepoPlantsPath(sourceFileName),
    planRepoGuildsPath(sourceFileName),
  ];
  const dates = await Promise.all(
    paths.map((path) => fetchLatestCommitDateMsForRepoPath(token, fullName, path)),
  );
  const defined = dates.filter((d): d is number => d !== undefined);
  if (defined.length === 0) {
    return undefined;
  }
  return Math.max(...defined);
};

/** Fetch remote shard commit times and merge with any cached value. */
export const refreshGithubRepoRemoteLastUpdatedMs = async (
  token: string,
  sourceFileName: string | undefined,
): Promise<number | undefined> => {
  loadGithubRepoRemoteLastUpdatedMs(sourceFileName);
  const fetched = await fetchRemotePlanLastUpdatedMs(token, sourceFileName);
  if (fetched !== undefined) {
    noteGithubRepoRemoteLastUpdatedMs(sourceFileName, fetched);
  }
  return githubRepoRemoteLastUpdatedMs.value;
};

export const pullPlanJsonFromGithubRepo = async (
  token: string,
  sourceFileName: string | undefined,
): Promise<PermaplannerFileV1> => {
  const fullName = await ensurePlanRepo(token);
  const plantsPath = planRepoPlantsPath(sourceFileName);
  const guildsPath = planRepoGuildsPath(sourceFileName);
  const configPath = planRepoConfigPath(sourceFileName);

  const plantsRaw = await getRepoJsonIfExists(token, fullName, plantsPath);
  const guildsRaw = await getRepoJsonIfExists(token, fullName, guildsPath);
  const configRaw = await getRepoJsonIfExists(token, fullName, configPath);
  if (plantsRaw === undefined && guildsRaw === undefined && configRaw === undefined) {
    throw new Error('No saved plan found in the GitHub repo for this garden.');
  }

  const cfg = (configRaw && typeof configRaw === 'object' ? configRaw : {}) as Record<
    string,
    unknown
  >;
  let backgroundImage: string | undefined;
  const bgPath =
    typeof cfg.backgroundImagePath === 'string' ? cfg.backgroundImagePath : undefined;
  if (bgPath) {
    const file = await getRepoContentsFile(token, fullName, bgPath);
    if (file) {
      const mime = dataUrlMimeForRepoPath(bgPath);
      const bytes = await fetchGithubRepoFileBytes(token, fullName, file);
      if (bytes.length > 0) {
        backgroundImage = `data:${mime};base64,${uint8ArrayToStandardBase64(bytes)}`;
      }
    }
  }

  const merged: Record<string, unknown> = {
    ...(await migratePlanDocumentRaw(cfg)),
    plants: plantsRaw !== undefined ? await plantsArrayFromShard(plantsRaw) : undefined,
    guilds: guildsRaw !== undefined ? await guildsArrayFromShard(guildsRaw) : undefined,
  };
  if (backgroundImage !== undefined) {
    merged.backgroundImage = backgroundImage;
  }

  return parsePermaplannerDocument(merged);
};

type PushPlanJob = {
  token: string;
  snapshot: PermaplannerFileV1;
  sourceFileName: string | undefined;
};

let pushPlanRunner: Promise<void> | null = null;
let queuedPushPlan: PushPlanJob | null = null;

const pushPlanJsonToGithubRepoOnce = async (
  token: string,
  snapshot: PermaplannerFileV1,
  sourceFileName: string | undefined,
): Promise<number | undefined> => {
  const fullName = await ensurePlanRepo(token);
  const configPath = planRepoConfigPath(sourceFileName);

  const bg = snapshot.backgroundImage;

  let backgroundImagePath: string | undefined;
  const gitFiles: GitPlanBlobFile[] = [];
  if (typeof bg === 'string' && bg.startsWith('data:')) {
    const img = decodeDataUrlImageForRepo(bg);
    if (img) {
      backgroundImagePath = planBackgroundMediaRepoPath(sourceFileName, img.ext);
      gitFiles.push({ path: backgroundImagePath, contentBase64: img.standardBase64 });
    }
  }

  const segment = planGardenFolderSegment(sourceFileName);
  const { configJson, plantsJson, guildsJson } = buildGithubPlanShardExports(snapshot, {
    gardenFolderSegment: segment,
    backgroundImagePath,
  });
  const guildsForViewer = (JSON.parse(guildsJson) as { guilds?: unknown }).guilds;
  const staticViewerHtml = renderPlanGardenViewerHtml(
    planGardenViewerTemplate,
    segment,
    guildsForViewer,
  );

  gitFiles.push(
    { path: planRepoPlantsPath(sourceFileName), contentBase64: utf8ToBase64(plantsJson) },
    { path: planRepoGuildsPath(sourceFileName), contentBase64: utf8ToBase64(guildsJson) },
    { path: configPath, contentBase64: utf8ToBase64(configJson) },
    {
      path: planRepoGardenViewerPath(sourceFileName),
      contentBase64: utf8ToBase64(staticViewerHtml),
    },
  );

  return commitPlanFilesViaGitApi(token, fullName, gitFiles, `Update plan (${segment})`);
};

export const pushPlanJsonToGithubRepo = async (
  token: string,
  snapshot: PermaplannerFileV1,
  sourceFileName: string | undefined,
): Promise<void> => {
  queuedPushPlan = { token, snapshot, sourceFileName };

  if (!pushPlanRunner) {
    pushPlanRunner = (async () => {
      githubRepoPushInFlightCount.value += 1;
      try {
        do {
          const job = queuedPushPlan!;
          queuedPushPlan = null;
          const committedAtMs = await pushPlanJsonToGithubRepoOnce(
            job.token,
            job.snapshot,
            job.sourceFileName,
          );
          noteGithubRepoRemoteLastUpdatedMs(
            job.sourceFileName,
            committedAtMs ?? Date.now(),
          );
        } while (queuedPushPlan);
        githubRepoLastSyncError.value = undefined;
      } finally {
        githubRepoPushInFlightCount.value -= 1;
        pushPlanRunner = null;
      }
    })();
  }

  return pushPlanRunner;
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
    const message =
      e instanceof GithubSyncError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    githubRepoLastSyncError.value = message;
    console.error('[permaplanner] GitHub repo sync failed:', e);
  }
};
