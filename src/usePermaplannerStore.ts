import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';
import { type Guild, type UserPlant } from './gardenTypes';
import { assert } from './utils';
import { plantCatalog } from './plantCatalog';
import { normalizePlantsFromFile } from './resolvePlant';
import { useMapScaleStore } from './useMapScaleStore';
import { mergeGuildsFromPersistence } from './guildPersistence';
import { migratePlanDocumentRaw } from './permaplannerFileMigrate';
import { buildLocalPlanJsonText } from './permaplannerFileExport';
import {
  PERMAPLANNER_FILE_VERSION,
  type PermaplannerFileVersion,
} from './permaplannerFileVersion';
import {
  clearPlanMigrationPending,
  isPlanMigrationPending,
  noteLocalPlanMigrationIfNeeded,
} from './usePlanMigration';
import {
  DEFAULT_ONBOARDING_STATE,
  normalizeOnboardingState,
  type OnboardingState,
} from './onboardingTypes';
import { clearFileBinding, persistFileBinding } from './sessionFileHandle';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export type PermaplannerFileV1 = {
  version: PermaplannerFileVersion;
  /** Monotonic plan version for comparing with the GitHub backup; not bumped on push. */
  syncRevision: number;
  plants: UserPlant[];
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
  onboardingState: OnboardingState;
};

const defaultUserPlants = (): UserPlant[] => [];

const defaultMapScaleSnapshot = (): PermaplannerFileV1['mapScale'] => ({
  start: { x: 20, y: 20 },
  end: { x: 150, y: 20 },
  linePhysicalLength: 1,
});

export const parsePermaplannerDocument = async (
  raw: unknown,
): Promise<PermaplannerFileV1> => {
  const data = (await migratePlanDocumentRaw(assert(raw))) as Record<string, unknown> & {
    plants?: unknown;
    guilds?: Guild[];
  };

  const backgroundImageFromFile =
    typeof data.backgroundImage === 'string' ? data.backgroundImage : undefined;

  const syncRevision =
    typeof data.syncRevision === 'number' && Number.isFinite(data.syncRevision)
      ? Math.max(0, Math.floor(data.syncRevision))
      : 0;

  const plants = normalizePlantsFromFile(data.plants ?? [], plantCatalog);

  const base: PermaplannerFileV1 = {
    version: PERMAPLANNER_FILE_VERSION,
    syncRevision,
    plants,
    guilds: mergeGuildsFromPersistence(data.guilds, data.guildLocations),
    mapScale: defaultMapScaleSnapshot(),
    backgroundOpacity: 0.4,
    onboardingState: normalizeOnboardingState(data.onboardingState),
  };
  if (backgroundImageFromFile !== undefined) {
    base.backgroundImage = backgroundImageFromFile;
  }

  if (data.mapScale && typeof data.mapScale === 'object' && data.mapScale !== null) {
    const ms = data.mapScale as Record<string, unknown>;
    if (
      ms.start &&
      typeof ms.start === 'object' &&
      ms.end &&
      typeof ms.end === 'object'
    ) {
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
            typeof ms.linePhysicalLength === 'number' &&
            Number.isFinite(ms.linePhysicalLength)
              ? ms.linePhysicalLength
              : 1,
        };
      }
    }
  }

  if (
    typeof data.backgroundOpacity === 'number' &&
    Number.isFinite(data.backgroundOpacity)
  ) {
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
  const plants = ref<UserPlant[]>(defaultUserPlants());
  const guilds = ref<Guild[]>([]);
  const syncRevision = ref(0);
  const onboardingState = ref<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  /** `File.lastModified` for the linked plan file (ms since epoch). */
  const localFileLastModifiedMs = ref<number | undefined>(undefined);

  /** Skip auto-save while hydrating from disk or similar bulk updates. */
  const suppressAutosaveDepth = ref(0);

  /** True while replacing plan state so reactive updates do not count as user edits. */
  const isBulkPlanUpdate = ref(false);

  const snapshot = (): PermaplannerFileV1 => {
    const mapScale = useMapScaleStore();
    const bg = backgroundImageDataUrl.value;
    const doc: PermaplannerFileV1 = {
      version: PERMAPLANNER_FILE_VERSION,
      syncRevision: syncRevision.value,
      plants: plants.value,
      guilds: guilds.value,
      mapScale: {
        start: { ...mapScale.start },
        end: { ...mapScale.end },
        linePhysicalLength: mapScale.linePhysicalLength,
      },
      backgroundOpacity: backgroundOpacity.value,
      onboardingState: onboardingState.value,
    };
    if (bg !== undefined) {
      doc.backgroundImage = bg;
    }
    return doc;
  };

  const noteLocalFileLastModified = async (handle: FileSystemFileHandle) => {
    const file = await handle.getFile();
    localFileLastModifiedMs.value = file.lastModified;
  };

  const writePlanToHandle = async (handle: FileSystemFileHandle) => {
    const text = buildLocalPlanJsonText(snapshot());
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    await noteLocalFileLastModified(handle);
    try {
      await persistFileBinding(handle);
    } catch (e) {
      console.error('Could not store file link for next visit:', e);
    }
  };

  const flushLocalSave = async () => {
    const h = fileHandle.value;
    if (!h || suppressAutosaveDepth.value > 0 || isPlanMigrationPending.value) {
      return;
    }
    await writePlanToHandle(h);
  };

  type LoadOptions = { skipBindingPersist?: boolean };

  const load = async (handle: FileSystemFileHandle, options?: LoadOptions) => {
    isBulkPlanUpdate.value = true;
    suppressAutosaveDepth.value += 1;
    try {
      const file = await handle.getFile();
      const text = await file.text();

      if (!options?.skipBindingPersist) {
        try {
          await persistFileBinding(handle);
        } catch (e) {
          console.error('Could not store file link for next visit:', e);
        }
      }

      const raw = JSON.parse(text) as unknown;
      noteLocalPlanMigrationIfNeeded(raw);
      const data = await parsePermaplannerDocument(raw);

      backgroundImageDataUrl.value = data.backgroundImage;
      backgroundOpacity.value = data.backgroundOpacity;
      plants.value = data.plants;
      guilds.value = data.guilds ?? [];
      syncRevision.value = data.syncRevision;
      onboardingState.value = data.onboardingState;
      applyToMapScale(data);

      fileHandle.value = handle;
      fileName.value = file.name;
      needsFileRelink.value = false;
      localFileLastModifiedMs.value = file.lastModified;
      usePlanCommandHistory().clear();
    } finally {
      await nextTick();
      suppressAutosaveDepth.value -= 1;
      await nextTick();
      isBulkPlanUpdate.value = false;
    }
  };

  const refreshLocalFileLastModified = async () => {
    const h = fileHandle.value;
    if (!h) {
      localFileLastModifiedMs.value = undefined;
      return;
    }
    await noteLocalFileLastModified(h);
  };

  const save = async (handle: FileSystemFileHandle) => {
    await writePlanToHandle(handle);
    fileHandle.value = handle;
    fileName.value = handle.name;
    needsFileRelink.value = false;
  };

  const resetToNewPlan = async () => {
    isBulkPlanUpdate.value = true;
    suppressAutosaveDepth.value += 1;
    try {
      fileHandle.value = undefined;
      fileName.value = undefined;
      localFileLastModifiedMs.value = undefined;
      needsFileRelink.value = false;
      await clearFileBinding();
      clearPlanMigrationPending();
      backgroundImageDataUrl.value = undefined;
      backgroundOpacity.value = 0.4;
      plants.value = defaultUserPlants();
      guilds.value = [];
      syncRevision.value = 0;
      onboardingState.value = DEFAULT_ONBOARDING_STATE;
      useMapScaleStore().resetToDefaults();
      usePlanCommandHistory().clear();
    } finally {
      await nextTick();
      suppressAutosaveDepth.value -= 1;
      await nextTick();
      isBulkPlanUpdate.value = false;
    }
  };

  const setSyncRevision = (n: number) => {
    if (Number.isFinite(n) && n >= 0) {
      syncRevision.value = Math.floor(n);
    }
  };

  const applyRemoteRepoSnapshot = (doc: PermaplannerFileV1) => {
    suppressAutosaveDepth.value += 1;
    isBulkPlanUpdate.value = true;
    try {
      backgroundImageDataUrl.value = doc.backgroundImage;
      backgroundOpacity.value = doc.backgroundOpacity;
      plants.value = doc.plants ?? defaultUserPlants();
      guilds.value = doc.guilds ?? [];
      syncRevision.value = doc.syncRevision;
      onboardingState.value = doc.onboardingState;
      applyToMapScale(doc);
      usePlanCommandHistory().clear();
    } finally {
      suppressAutosaveDepth.value -= 1;
    }
    void nextTick(() => {
      isBulkPlanUpdate.value = false;
    });
  };

  return {
    load,
    save,
    resetToNewPlan,
    snapshot,
    flushLocalSave,
    suppressAutosaveDepth,
    isBulkPlanUpdate,
    fileName,
    fileHandle,
    needsFileRelink,
    backgroundImageDataUrl,
    backgroundOpacity,
    plants,
    guilds,
    syncRevision,
    onboardingState,
    setSyncRevision,
    localFileLastModifiedMs,
    refreshLocalFileLastModified,
    applyRemoteRepoSnapshot,
  };
});
