import { expect, it } from 'vitest';

import {
  buildGithubAuthorizeUrl,
  GITHUB_PLAN_SYNC_REPO_NAME,
  gitBranchHeadRefSegment,
  getPlanRepoGardenViewerUrl,
  githubSyncUserMessage,
  planBackgroundMediaRepoPath,
  planGardenFolderSegment,
  planPathSegment,
  planRepoConfigPath,
  planRepoGuildsPath,
  planRepoPlantsPath,
  readGithubCommitDateMs,
} from './githubRepoSync';

it('GITHUB_PLAN_SYNC_REPO_NAME is the fixed backup repo slug', () => {
  expect(GITHUB_PLAN_SYNC_REPO_NAME).toBe('permaplanner-plan-sync');
});

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

it('githubSyncUserMessage for 409 suggests pulling remote before saving again', () => {
  const message = githubSyncUserMessage(
    'write',
    'refs/heads/main',
    409,
    '{"message":"Update is not a fast forward"}',
  );
  expect(message).toMatch(/Pull remote/i);
  expect(message).not.toMatch(/overwrite/i);
});

it('readGithubCommitDateMs prefers committer date over author', () => {
  const ms = readGithubCommitDateMs({
    commit: {
      author: { date: '2020-01-01T00:00:00Z' },
      committer: { date: '2024-06-15T12:30:00Z' },
    },
  });
  expect(ms).toBe(Date.parse('2024-06-15T12:30:00Z'));
});

it('readGithubCommitDateMs returns undefined for missing commit', () => {
  expect(readGithubCommitDateMs({ type: 'file' })).toBeUndefined();
});

it('githubSyncUserMessage prefers GitHub API message for other errors when present', () => {
  expect(
    githubSyncUserMessage(
      'read',
      'plans/garden/config.json',
      500,
      '{"message":"Server Error"}',
    ),
  ).toBe('Server Error');
});

it('getPlanRepoGardenViewerUrl uses owner.github.io/<repo>/viewer.html for project pages', () => {
  window.localStorage.setItem(
    'permaplanner.github.planRepoFullName',
    'octocat/permaplanner-plan-sync',
  );
  try {
    expect(getPlanRepoGardenViewerUrl('my plan.json')).toBe(
      'https://octocat.github.io/permaplanner-plan-sync/plans/my-plan/viewer.html',
    );
  } finally {
    window.localStorage.removeItem('permaplanner.github.planRepoFullName');
  }
});

it('getPlanRepoGardenViewerUrl omits repo segment for owner.github.io repo', () => {
  window.localStorage.setItem(
    'permaplanner.github.planRepoFullName',
    'octocat/octocat.github.io',
  );
  try {
    expect(getPlanRepoGardenViewerUrl('garden.json')).toBe(
      'https://octocat.github.io/plans/garden/viewer.html',
    );
  } finally {
    window.localStorage.removeItem('permaplanner.github.planRepoFullName');
  }
});
