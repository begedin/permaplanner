import * as gardensApi from '../api/gardens';

const records = (value: unknown): Record<string, unknown>[] => {
  if (
    !Array.isArray(value) ||
    value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
  ) {
    throw new Error('Invalid split guild data');
  }
  return value;
};

export const importJsonText = async (
  text: string,
  opts?: { name?: string },
): Promise<gardensApi.GardenRecord> => importGardenDocument(JSON.parse(text), opts);

export const importGardenDocument = async (
  document: unknown,
  opts?: { name?: string },
): Promise<gardensApi.GardenRecord> => {
  if (document && typeof document === 'object' && 'guildLocations' in document) {
    const { guildLocations, ...rest } = document as Record<string, unknown>;
    const locations = new Map(
      records(guildLocations).map((location) => [location.id, location]),
    );
    document = {
      ...rest,
      guilds: records(rest.guilds).map((guild) => {
        const location = locations.get(guild.id);
        if (!location || !Array.isArray(location.path)) {
          throw new Error('Missing guild geometry');
        }
        const geometry = new Map(
          records(location.plants).map((plant) => [plant.id, plant]),
        );
        return {
          ...guild,
          path: location.path,
          plants: records(guild.plants).map(({ name, ...plant }) => {
            const coordinates = geometry.get(plant.id);
            if (
              !coordinates ||
              typeof name !== 'string' ||
              !['x', 'y', 'width', 'height'].every(
                (key) =>
                  typeof coordinates[key] === 'number' &&
                  Number.isFinite(coordinates[key]),
              )
            ) {
              throw new Error('Invalid plant geometry or name');
            }
            const { x, y, width, height } = coordinates;
            return { ...plant, nameOrCultivar: name, x, y, width, height };
          }),
        };
      }),
    };
  }
  return gardensApi.importGardenDocument({ document, name: opts?.name });
};

export const pickAndImportLocalFile = async (): Promise<gardensApi.GardenRecord> => {
  const [handle] = await window.showOpenFilePicker({
    types: [{ accept: { 'application/json': ['.json'] } }],
    multiple: false,
  });
  const file = await handle.getFile();
  const stem = file.name.replace(/\.json$/i, '') || 'Imported garden';
  return importJsonText(await file.text(), { name: stem });
};
