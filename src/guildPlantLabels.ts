import type { GardenDocumentPayload } from './gardenDocument';
import { plantCatalog } from './plantCatalog';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';

const hasMeaningfulPlantLabel = (label: string | undefined): boolean =>
  typeof label === 'string' &&
  label.trim() !== '' &&
  label.trim().toLowerCase() !== 'plant';

export const withPersistedGuildPlantLabels = (
  snapshot: GardenDocumentPayload,
): GardenDocumentPayload => {
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
