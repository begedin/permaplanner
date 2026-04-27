import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Guild, Plant } from './gardenTypes';
import { assert } from './utils';
import { plants as defaultPlantsCatalog } from './plants';
import { useMapScaleStore } from './useMapScaleStore';
import { clearFileBinding, persistFileBinding } from './sessionFileHandle';

const defaultPlants = (): Plant[] => structuredClone(defaultPlantsCatalog);

const FILE_VERSION = 1;

export type PermaplannerFileV1 = {
  version: typeof FILE_VERSION;
  plants: Plant[];
  guilds: Guild[];
  mapScale: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    linePhysicalLength: number;
  };
  backgroundOpacity: number;
  /** Large base64 data URL — kept last in JSON for readability when opening the file. */
  backgroundImage?: string;
  /** Repo-relative image path (GitHub sync export only); local saves omit this. */
  backgroundImagePath?: string;
};

const defaultMapScaleSnapshot = (): PermaplannerFileV1['mapScale'] => ({
  start: { x: 20, y: 20 },
  end: { x: 150, y: 20 },
  linePhysicalLength: 1,
});

const parseDocument = (raw: unknown): PermaplannerFileV1 => {
  const data = assert(raw) as Record<string, unknown> & { plants?: Plant[]; guilds?: Guild[] };

  const backgroundImageFromFile =
    typeof data.backgroundImage === 'string'
      ? data.backgroundImage
      : typeof data.backgroundImageDataUrl === 'string'
        ? data.backgroundImageDataUrl
        : undefined;

  const base: PermaplannerFileV1 = {
    version: FILE_VERSION,
    plants: (Array.isArray(data.plants) && data.plants.length ? data.plants : defaultPlants()) as Plant[],
    guilds: (Array.isArray(data.guilds) ? data.guilds : []) as Guild[],
    mapScale: defaultMapScaleSnapshot(),
    backgroundOpacity: 0.4,
  };
  if (backgroundImageFromFile !== undefined) {
    base.backgroundImage = backgroundImageFromFile;
  }

  if (data.mapScale && typeof data.mapScale === 'object' && data.mapScale !== null) {
    const ms = data.mapScale as Record<string, unknown>;
    if (ms.start && typeof ms.start === 'object' && ms.end && typeof ms.end === 'object') {
      const s = ms.start as { x?: number; y?: number };
      const e = ms.end as { x?: number; y?: number };
      if (
        typeof s.x === 'number' &&
        typeof s.y === 'number' &&
        typeof e.x === 'number' &&
        typeof e.y === 'number'
      ) {
        base.mapScale = {
          start: { x: s.x, y: s.y },
          end: { x: e.x, y: e.y },
          linePhysicalLength:
            typeof ms.linePhysicalLength === 'number' && Number.isFinite(ms.linePhysicalLength)
              ? ms.linePhysicalLength
              : 1,
        };
      }
    }
  }

  if (typeof data.backgroundOpacity === 'number' && Number.isFinite(data.backgroundOpacity)) {
    base.backgroundOpacity = data.backgroundOpacity;
  }

  return base;
};

const applyToMapScale = (doc: PermaplannerFileV1) => {
  const mapScale = useMapScaleStore();
  Object.assign(mapScale.start, doc.mapScale.start);
  Object.assign(mapScale.end, doc.mapScale.end);
  mapScale.linePhysicalLength = doc.mapScale.linePhysicalLength;
};

export const usePermaplannerStore = defineStore('permaplanner', () => {
  const fileHandle = ref<FileSystemFileHandle>();
  const fileName = ref<string | undefined>();
  const needsFileRelink = ref(false);

  const backgroundImageDataUrl = ref<string | undefined>();
  const backgroundOpacity = ref(0.4);
  const plants = ref<Plant[]>(defaultPlants());
  const guilds = ref<Guild[]>([]);

  const snapshot = (): PermaplannerFileV1 => {
    const mapScale = useMapScaleStore();
    const bg = backgroundImageDataUrl.value;
    const doc: PermaplannerFileV1 = {
      version: FILE_VERSION,
      plants: plants.value,
      guilds: guilds.value,
      mapScale: {
        start: { ...mapScale.start },
        end: { ...mapScale.end },
        linePhysicalLength: mapScale.linePhysicalLength,
      },
      backgroundOpacity: backgroundOpacity.value,
    };
    if (bg !== undefined) {
      doc.backgroundImage = bg;
    }
    return doc;
  };

  type LoadOptions = { skipBindingPersist?: boolean };

  const load = async (handle: FileSystemFileHandle, options?: LoadOptions) => {
    const file = await handle.getFile();
    const text = await file.text();

    if (!options?.skipBindingPersist) {
      try {
        await persistFileBinding(handle);
      } catch (e) {
        console.error('Could not store file link for next visit:', e);
      }
    }

    const data = parseDocument(JSON.parse(text) as unknown);

    backgroundImageDataUrl.value = data.backgroundImage;
    backgroundOpacity.value = data.backgroundOpacity;
    plants.value = data.plants?.length ? data.plants : defaultPlants();
    guilds.value = data.guilds ?? [];
    applyToMapScale(data);

    fileHandle.value = handle;
    fileName.value = file.name;
    needsFileRelink.value = false;
  };

  const save = async (handle: FileSystemFileHandle) => {
    const text = JSON.stringify(snapshot(), null, 2);

    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();

    fileHandle.value = handle;
    fileName.value = handle.name;
    needsFileRelink.value = false;

    try {
      await persistFileBinding(handle);
    } catch (e) {
      console.error('Could not store file link for next visit:', e);
    }
  };

  const resetToNewPlan = async () => {
    fileHandle.value = undefined;
    fileName.value = undefined;
    needsFileRelink.value = false;
    await clearFileBinding();
    backgroundImageDataUrl.value = undefined;
    backgroundOpacity.value = 0.4;
    plants.value = defaultPlants();
    guilds.value = [];
    useMapScaleStore().resetToDefaults();
  };

  return {
    load,
    save,
    resetToNewPlan,
    snapshot,
    fileName,
    fileHandle,
    needsFileRelink,
    backgroundImageDataUrl,
    backgroundOpacity,
    plants,
    guilds,
  };
});
