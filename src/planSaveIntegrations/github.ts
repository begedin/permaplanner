import {
  getGithubAccessToken,
  getPlanRepoGardenFolderUrl,
  getPlanRepoGardenViewerUrl,
  githubRepoLastSyncError,
  githubRepoRemoteLastUpdatedMs,
  GithubSyncError,
  planRepoSyncUpdatedEventName,
  pushPlanJsonToGithubRepo,
  readGithubClientIdConfig,
  refreshGithubRepoRemoteLastUpdatedMs,
} from '../githubRepoSync';
import type { PlanSaveContext, PlanSaveIntegration } from '../planSaveIntegration';

const formatTimestamp = (ms: number | undefined): string =>
  ms === undefined ? '—' : new Date(ms).toLocaleString();

export const githubPlanSaveIntegration: PlanSaveIntegration = {
  id: 'github',
  label: 'GitHub',
  isAvailable: () => Boolean(readGithubClientIdConfig()),
  isLinked: () => Boolean(getGithubAccessToken()),
  save: async (ctx: PlanSaveContext) => {
    const token = getGithubAccessToken();
    if (!token) {
      return;
    }
    await pushPlanJsonToGithubRepo(token, ctx.snapshot(), ctx.fileName());
    githubRepoLastSyncError.value = undefined;
    window.dispatchEvent(new Event(planRepoSyncUpdatedEventName));
  },
  loadDetails: async (ctx: PlanSaveContext) => {
    const fileName = ctx.fileName();
    const rows: Awaited<ReturnType<PlanSaveIntegration['loadDetails']>> = [];

    const token = getGithubAccessToken();
    let remoteMs = githubRepoRemoteLastUpdatedMs.value;
    if (token) {
      try {
        remoteMs = await refreshGithubRepoRemoteLastUpdatedMs(token, fileName);
      } catch {
        /* keep cached / persisted timestamp */
      }
    }

    rows.push({
      kind: 'text',
      label: 'Remote last saved',
      value: formatTimestamp(remoteMs),
    });

    const folderUrl = getPlanRepoGardenFolderUrl(fileName);
    if (folderUrl) {
      rows.push({
        kind: 'link',
        label: 'Plan folder on GitHub',
        href: folderUrl,
      });
    }

    const viewerUrl = getPlanRepoGardenViewerUrl(fileName);
    if (viewerUrl) {
      rows.push({
        kind: 'link',
        label: 'GitHub Pages guilds view',
        href: viewerUrl,
      });
    }

    return rows;
  },
};

export const githubSaveFailureMessage = (e: unknown): string =>
  e instanceof GithubSyncError ? e.message : e instanceof Error ? e.message : String(e);
