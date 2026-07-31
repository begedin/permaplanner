import { splitGuildsForPersistence } from './guildPersistence';
import { plantCatalog } from './plantCatalog';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';
import type { GardenDocument } from './gardenDocument';

const hasMeaningfulPlantLabel = (label: string | undefined): boolean =>
  typeof label === 'string' &&
  label.trim() !== '' &&
  label.trim().toLowerCase() !== 'plant';

export const withPersistedGuildPlantLabels = (
  snapshot: GardenDocument,
): GardenDocument => {
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

export const buildLocalPlanJsonText = (snapshot: GardenDocument): string => {
  const normalized = withPersistedGuildPlantLabels(snapshot);
  const { guilds, guildLocations } = splitGuildsForPersistence(normalized.guilds);

  const { guilds: _merged, ...rest } = normalized;
  return JSON.stringify({ ...rest, guilds, guildLocations }, null, 2);
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
