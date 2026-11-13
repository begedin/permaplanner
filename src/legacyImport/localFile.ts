import { rectangleShapePath } from '../mapShapeGeometry';
import { convertLegacyGuildPath } from './guildPath';
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
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 5
  ) {
    const old = document as Record<string, unknown>;
    document = {
      ...old,
      version: 6,
      landmarks: [],
      mapScale: { ...(old.mapScale as Record<string, unknown>), unit: 'unspecified' },
    };
  }
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 6
  ) {
    document = { ...document, version: 7, plotBorder: [] };
  }
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 7
  ) {
    const old = document as Record<string, unknown>;
    document = {
      ...old,
      version: 8,
      guilds: records(old.guilds).map((guild) => ({
        ...guild,
        path: convertLegacyGuildPath(guild.path),
      })),
    };
  }
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 8
  ) {
    const old = document as Record<string, unknown>;
    const border = records(old.plotBorder);
    document = {
      ...old,
      version: 9,
      landmarks: records(old.landmarks).map((landmark) => ({
        ...landmark,
        path: rectangleShapePath(),
      })),
      plotBorder: border.length ? [[[...border, { ...border[0] }]]] : [],
    };
  }
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 9
  ) {
    document = { ...document, version: 10, paths: [] };
  }
  if (
    document &&
    typeof document === 'object' &&
    'version' in document &&
    document.version === 10
  ) {
    const old = document as Record<string, unknown>;
    document = {
      ...old,
      version: 11,
      guilds: records(old.guilds).map((guild) => ({
        ...guild,
        plants: records(guild.plants).map((plant) => ({
          ...plant,
          placed:
            typeof plant.placed === 'boolean'
              ? plant.placed
              : typeof plant.width === 'number' &&
                typeof plant.height === 'number' &&
                plant.width > 0 &&
                plant.height > 0 &&
                !(plant.width === 16 && plant.height === 16),
        })),
      })),
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
