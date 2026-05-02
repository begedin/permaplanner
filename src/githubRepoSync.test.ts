import { expect, it } from 'vitest';

import {
  buildGithubAuthorizeUrl,
  nextSyncRevisionForPush,
  planBackgroundMediaRepoPath,
  planGardenFolderSegment,
  planPathSegment,
  planRepoConfigPath,
  planRepoGuildsPath,
  planRepoPlantsPath,
} from './githubRepoSync';

it('buildGithubAuthorizeUrl uses repo scope for private repo + Contents API', () => {
  const url = buildGithubAuthorizeUrl({
    clientId: 'abc',
    redirectUri: 'http://localhost:5173/guilds',
    state: 'state-token',
    codeChallenge: 'challenge',
  });
  const u = new URL(url);
  expect(Object.fromEntries(u.searchParams.entries())).toMatchObject({
    client_id: 'abc',
    scope: 'repo',
    state: 'state-token',
    code_challenge: 'challenge',
  });
});

it('planPathSegment sanitizes; repo paths use one folder per garden under plans/', () => {
  expect(planPathSegment('My Garden!.json')).toBe('My-Garden-.json');
  expect(planGardenFolderSegment('foo.bar')).toBe('foo.bar');
  expect(planRepoPlantsPath('foo.bar')).toBe('plans/foo.bar/plants.json');
  expect(planRepoGuildsPath('foo.bar')).toBe('plans/foo.bar/guilds.json');
  expect(planRepoConfigPath('foo.bar')).toBe('plans/foo.bar/config.json');
  expect(planBackgroundMediaRepoPath('foo.json', 'png')).toBe('plans/foo/background.png');
});

it('nextSyncRevisionForPush bumps above both local and remote', () => {
  expect(nextSyncRevisionForPush(0, 0)).toBe(1);
  expect(nextSyncRevisionForPush(3, 5)).toBe(6);
  expect(nextSyncRevisionForPush(5, 3)).toBe(6);
});
