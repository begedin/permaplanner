import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';

import { type GardenDocument, parseGardenDocument } from './gardenDocument';
import { type Guild, type UserPlant } from './gardenTypes';
import { useMapScaleStore } from './useMapScaleStore';
import {
  PERMAPLANNER_FILE_VERSION,
} from './permaplannerFileVersion';
import {
  DEFAULT_ONBOARDING_STATE,
  type OnboardingState,
} from './onboardingTypes';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const defaultUserPlants = (): UserPlant[] => [];

const applyToMapScale = (doc: GardenDocument) => {
  const mapScale = useMapScaleStore();
  Object.assign(mapScale.start, doc.mapScale.start);
  Object.assign(mapScale.end, doc.mapScale.end);
  mapScale.linePhysicalLength = doc.mapScale.linePhysicalLength;
};

export const usePermaplannerStore = defineStore('permaplanner', () => {
  const gardenId = ref<string | undefined>();
  const gardenName = ref<string | undefined>();

  const backgroundImageDataUrl = ref<string | undefined>();
  const backgroundImageSavedDataUrl = ref<string | undefined>();
  const backgroundOpacity = ref(0.4);
  const plants = ref<UserPlant[]>(defaultUserPlants());
  const guilds = ref<Guild[]>([]);
  const syncRevision = ref(0);
  const onboardingState = ref<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  const suppressAutosaveDepth = ref(0);
  const isBulkPlanUpdate = ref(false);

  const snapshot = (): GardenDocument => {
    const mapScale = useMapScaleStore();
    const bg = backgroundImageDataUrl.value;
    const doc: GardenDocument = {
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

  /** Plan JSON for server save — omits background unless it changed since last save. */
  const snapshotForServer = ():
    | GardenDocument
    | (Omit<GardenDocument, 'backgroundImage'> & { backgroundImage?: string | null }) => {
    const doc = snapshot();
    const current = backgroundImageDataUrl.value;
    const saved = backgroundImageSavedDataUrl.value;

    if (current === saved) {
      const { backgroundImage: _removed, ...rest } = doc;
      return rest;
    }

    if (current === undefined) {
      const { backgroundImage: _removed, ...rest } = doc;
      return { ...rest, backgroundImage: null };
    }

    return doc;
  };

  const noteBackgroundImageSaved = () => {
    backgroundImageSavedDataUrl.value = backgroundImageDataUrl.value;
  };

  const hydrateFromDocument = async (
    doc: GardenDocument,
    meta?: { id?: string; name?: string },
  ) => {
    isBulkPlanUpdate.value = true;
    suppressAutosaveDepth.value += 1;
    try {
      backgroundImageDataUrl.value = doc.backgroundImage;
      backgroundImageSavedDataUrl.value = doc.backgroundImage;
      backgroundOpacity.value = doc.backgroundOpacity;
      plants.value = doc.plants;
      guilds.value = doc.guilds ?? [];
      syncRevision.value = doc.syncRevision;
      onboardingState.value = doc.onboardingState;
      applyToMapScale(doc);
      gardenId.value = meta?.id;
      gardenName.value = meta?.name;
      usePlanCommandHistory().clear();
    } finally {
      await nextTick();
      suppressAutosaveDepth.value -= 1;
      await nextTick();
      isBulkPlanUpdate.value = false;
    }
  };

  const loadFromRaw = async (raw: unknown, meta?: { id?: string; name?: string }) => {
    const doc = await parseGardenDocument(raw);
    await hydrateFromDocument(doc, meta);
  };

  const resetToNewPlan = async () => {
    isBulkPlanUpdate.value = true;
    suppressAutosaveDepth.value += 1;
    try {
      gardenId.value = undefined;
      gardenName.value = undefined;
      backgroundImageDataUrl.value = undefined;
      backgroundImageSavedDataUrl.value = undefined;
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

  return {
    gardenId,
    gardenName,
    snapshot,
    snapshotForServer,
    noteBackgroundImageSaved,
    hydrateFromDocument,
    loadFromRaw,
    resetToNewPlan,
    suppressAutosaveDepth,
    isBulkPlanUpdate,
    backgroundImageDataUrl,
    backgroundImageSavedDataUrl,
    backgroundOpacity,
    plants,
    guilds,
    syncRevision,
    onboardingState,
    setSyncRevision,
  };
});
