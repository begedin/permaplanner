import { splitGuildsForPersistence } from './guildPersistence';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import type { PermaplannerFileV1 } from './usePermaplannerStore';

export const buildLocalPlanJsonText = (snapshot: PermaplannerFileV1): string => {
  const { guilds, guildLocations } = splitGuildsForPersistence(snapshot.guilds);
   
  const { guilds: _merged, ...rest } = snapshot;
  return JSON.stringify({ ...rest, guilds, guildLocations }, null, 2);
};

export type GithubPlanShardExports = {
  configJson: string;
  plantsJson: string;
  guildsJson: string;
  /** Folder segment under `plans/` (used in download filenames). */
  gardenFolderSegment: string;
};

export const buildGithubPlanShardExports = (
  snapshot: PermaplannerFileV1,
  options: { gardenFolderSegment: string; backgroundImagePath?: string },
): GithubPlanShardExports => {
  const configJson = JSON.stringify(
    {
      version: snapshot.version,
      syncRevision: snapshot.syncRevision,
      mapScale: snapshot.mapScale,
      backgroundOpacity: snapshot.backgroundOpacity,
      ...(options.backgroundImagePath !== undefined
        ? { backgroundImagePath: options.backgroundImagePath }
        : {}),
    },
    null,
    2,
  );
  const plantsJson = JSON.stringify(
    { version: PERMAPLANNER_FILE_VERSION, plants: snapshot.plants },
    null,
    2,
  );
  const { guilds, guildLocations } = splitGuildsForPersistence(snapshot.guilds);
  const guildsJson = JSON.stringify(
    { version: PERMAPLANNER_FILE_VERSION, guilds, guildLocations },
    null,
    2,
  );
  return {
    configJson,
    plantsJson,
    guildsJson,
    gardenFolderSegment: options.gardenFolderSegment,
  };
};

export const downloadTextAsFile = (
  filename: string,
  text: string,
  mime = 'application/json',
): void => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
