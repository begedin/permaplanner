import { defineStore, storeToRefs } from 'pinia';
import { nextTick, ref, toRefs } from 'vue';

import {
  GARDEN_DOCUMENT_VERSION,
  type GardenDocument,
  type GardenDocumentPayload,
} from './gardenDocument';
import { createEmptyPlanState } from './planSavableState';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const usePermaplannerStore = defineStore('permaplanner', () => {
  const gardenId = ref<string | undefined>();
  const gardenName = ref<string | undefined>();

  const plan = usePlanStateStore();
  const { mapScale: _mapScale, ...editableFields } = toRefs(plan.state);
  const { backgroundImageDataUrl } = editableFields;
  const { isBulkPlanUpdate } = storeToRefs(plan);
  const backgroundImageSavedDataUrl = ref<string | undefined>();
  const syncRevision = ref(0);
  let replacementDepth = 0;

  const snapshot = (): GardenDocument => {
    const { backgroundImageDataUrl, ...data } = plan.capture();
    return {
      ...data,
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: syncRevision.value,
      ...(backgroundImageDataUrl === undefined
        ? {}
        : { backgroundImage: backgroundImageDataUrl }),
    };
  };

  /** API-update snapshot; omits the background image unless it changed. */
  const snapshotForServer = (): GardenDocumentPayload => {
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

  const hydrateFromDocument = async (
    doc: GardenDocument,
    meta?: { id?: string; name?: string },
  ) => {
    replacementDepth += 1;
    isBulkPlanUpdate.value = true;
    try {
      const { version: _version, syncRevision: revision, backgroundImage, ...data } = doc;
      plan.restore({ ...data, backgroundImageDataUrl: backgroundImage });
      backgroundImageSavedDataUrl.value = backgroundImage;
      syncRevision.value = revision;
      gardenId.value = meta?.id;
      gardenName.value = meta?.name;
      usePlanCommandHistory().clear();
    } finally {
      await nextTick();
      replacementDepth -= 1;
      isBulkPlanUpdate.value = replacementDepth > 0;
    }
  };

  const resetToNewPlan = () => {
    const { backgroundImageDataUrl: _image, ...data } = createEmptyPlanState();
    return hydrateFromDocument({
      ...data,
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: 0,
    });
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
    hydrateFromDocument,
    resetToNewPlan,
    isBulkPlanUpdate,
    ...editableFields,
    backgroundImageSavedDataUrl,
    syncRevision,
    setSyncRevision,
  };
});
