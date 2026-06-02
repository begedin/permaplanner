import { splitGuildsForPersistence } from './guildPersistence';
import { plantCatalog } from './plantCatalog';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';
import type { PermaplannerFileV1 } from './usePermaplannerStore';

const hasMeaningfulPlantLabel = (label: string | undefined): boolean =>
  typeof label === 'string' &&
  label.trim() !== '' &&
  label.trim().toLowerCase() !== 'plant';

const withPersistedGuildPlantLabels = (
  snapshot: PermaplannerFileV1,
): PermaplannerFileV1 => {
  const labelByPlantId = new Map(
    snapshot.plants.map((userPlant) => [
      userPlant.id,
      plantDisplayLabel(resolveUserPlant(userPlant, plantCatalog)),
    ]),
  );

  const guilds = snapshot.guilds.map((guild) => ({
    ...guild,
    plants: guild.plants.map((thing) => {
      const resolved = labelByPlantId.get(thing.plantId);
      if (!resolved) {
        return thing;
      }
      if (
        hasMeaningfulPlantLabel(resolved) ||
        !hasMeaningfulPlantLabel(thing.nameOrCultivar)
      ) {
        if (thing.nameOrCultivar === resolved) {
          return thing;
        }
        return { ...thing, nameOrCultivar: resolved };
      }
      return thing;
    }),
  }));

  return { ...snapshot, guilds };
};

export const buildLocalPlanJsonText = (snapshot: PermaplannerFileV1): string => {
  const normalized = withPersistedGuildPlantLabels(snapshot);
  const { guilds, guildLocations } = splitGuildsForPersistence(normalized.guilds);

  const { guilds: _merged, ...rest } = normalized;
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
  const normalized = withPersistedGuildPlantLabels(snapshot);
  const configJson = JSON.stringify(
    {
      version: normalized.version,
      syncRevision: normalized.syncRevision,
      mapScale: normalized.mapScale,
      backgroundOpacity: normalized.backgroundOpacity,
      onboardingState: normalized.onboardingState,
      ...(options.backgroundImagePath !== undefined
        ? { backgroundImagePath: options.backgroundImagePath }
        : {}),
    },
    null,
    2,
  );
  const plantsJson = JSON.stringify(
    { version: PERMAPLANNER_FILE_VERSION, plants: normalized.plants },
    null,
    2,
  );
  const { guilds, guildLocations } = splitGuildsForPersistence(normalized.guilds);
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
