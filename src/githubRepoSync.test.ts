import { expect, it } from 'vitest';

import {
  buildGithubAuthorizeUrl,
  gitBranchHeadRefSegment,
  githubSyncUserMessage,
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

it('gitBranchHeadRefSegment is heads/branch for the Git ref API', () => {
  expect(gitBranchHeadRefSegment()).toBe('heads/main');
});

it('githubSyncUserMessage for 409 suggests pushing again with local copy', () => {
  const message = githubSyncUserMessage(
    'write',
    'refs/heads/main',
    409,
    '{"message":"Update is not a fast forward"}',
  );
  expect(message).toMatch(/Push again/i);
  expect(message).not.toMatch(/pull remote/i);
});

it('githubSyncUserMessage prefers GitHub API message for other errors when present', () => {
  expect(
    githubSyncUserMessage('read', 'plans/garden/config.json', 500, '{"message":"Server Error"}'),
  ).toBe('Server Error');
});
