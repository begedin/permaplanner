import { withPersistedGuildPlantLabels } from '../guildPlantLabels';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { ApiError } from '../api/client';
import * as gardensApi from '../api/gardens';
import type { GardenRecord, GardenSummary } from '../api/gardens';
import { planSavableStatesEqual, type PlanSavableState } from '../planSavableState';
import { usePlanStateStore } from '../usePlanStateStore';
import { usePlanCommandHistory } from '../usePlanCommandHistory';
import { createEmptyPlanState } from '../planSavableState';
import {
  GARDEN_DOCUMENT_VERSION,
  type GardenDocument,
  type GardenDocumentPayload,
} from '../gardenDocument';
import { useAuthStore } from './useAuthStore';

const ACTIVE_GARDEN_KEY = 'permaplanner.activeGardenId';

const formatTimestamp = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export type PlanSaveStatus = 'inactive' | 'unsaved' | 'saving' | 'saved' | 'error';

export const useGardenSessionStore = defineStore('gardenSession', () => {
  const plan = usePlanStateStore();
  const gardenId = ref<string>();
  const gardenName = ref<string>();
  const syncRevision = ref(0);
  const auth = useAuthStore();

  const gardens = ref<GardenSummary[]>([]);
  const loading = ref(false);
  const isBootstrapping = ref(true);
  const saving = ref(false);
  const errorMessage = ref<string>();
  const savedState = shallowRef<PlanSavableState>();

  const sessionGeneration = ref(0);
  let activationRequest = 0;
  let listRequest = 0;
  let bootstrapInFlight: Promise<void> | null = null;

  const isSaveAvailable = computed(() =>
    Boolean(auth.user?.totpConfirmed && gardenId.value),
  );
  const hasUnsavedChanges = computed(
    () =>
      isSaveAvailable.value &&
      savedState.value !== undefined &&
      (saving.value || !planSavableStatesEqual(savedState.value, plan.state)),
  );
  const canSave = computed(() => hasUnsavedChanges.value && !saving.value);
  const status = computed((): PlanSaveStatus => {
    if (!isSaveAvailable.value) return 'inactive';
    if (saving.value) return 'saving';
    if (errorMessage.value) return 'error';
    if (hasUnsavedChanges.value) return 'unsaved';
    return 'saved';
  });
  const details = computed(() => {
    const rows: { label: string; value: string }[] = [];
    if (gardenName.value) {
      rows.push({ label: 'Garden', value: gardenName.value });
    }
    const summary = gardens.value.find((garden) => garden.id === gardenId.value);
    rows.push({ label: 'Last saved', value: formatTimestamp(summary?.updatedAt) });
    return rows;
  });

  const persistActiveId = (id: string | undefined) => {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (id) {
      localStorage.setItem(ACTIVE_GARDEN_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_GARDEN_KEY);
    }
  };

  const markSaved = () => {
    savedState.value = plan.capture();
    errorMessage.value = undefined;
  };

  const buildDocument = (state: PlanSavableState): GardenDocument => {
    const { backgroundImageDataUrl, ...data } = state;
    return {
      ...data,
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: syncRevision.value,
      ...(backgroundImageDataUrl === undefined
        ? {}
        : { backgroundImage: backgroundImageDataUrl }),
    };
  };

  const snapshot = () => buildDocument(plan.capture());

  const hydrateFromDocument = (
    doc: GardenDocument,
    meta?: { id?: string; name?: string },
  ) => {
    sessionGeneration.value += 1;
    saving.value = false;
    const { version: _version, syncRevision: revision, backgroundImage, ...data } = doc;
    plan.restore(
      withPersistedGuildPlantLabels({ ...data, backgroundImageDataUrl: backgroundImage }),
    );
    syncRevision.value = revision;
    gardenId.value = meta?.id;
    gardenName.value = meta?.name;
    usePlanCommandHistory().clear();
    markSaved();
  };

  const commitGarden = (garden: GardenRecord, request: number): boolean => {
    if (request !== activationRequest) return false;
    hydrateFromDocument(garden.document, { id: garden.id, name: garden.name });
    persistActiveId(garden.id);
    return true;
  };

  const refreshList = async () => {
    const request = ++listRequest;
    loading.value = true;
    try {
      const nextGardens = await gardensApi.listGardens();
      if (request === listRequest) {
        gardens.value = nextGardens;
      }
    } finally {
      if (request === listRequest) {
        loading.value = false;
      }
    }
  };

  const activateGarden = async (id: string) => {
    const request = ++activationRequest;
    const garden = await gardensApi.fetchGarden(id);
    commitGarden(garden, request);
    return garden;
  };

  const activateGardenRecord = (garden: GardenRecord) => {
    const request = ++activationRequest;
    commitGarden(garden, request);
  };

  const createEmptyGarden = async (name?: string) => {
    const request = ++activationRequest;
    const garden = await gardensApi.createGarden(name);
    const committed = commitGarden(garden, request);
    if (committed) {
      await refreshList().catch(() => undefined);
    }
    return garden;
  };

  const bootstrap = async () => {
    if (bootstrapInFlight) return bootstrapInFlight;

    isBootstrapping.value = true;
    const request = ++activationRequest;
    const operation = (async () => {
      const nextGardens = await gardensApi.listGardens();
      if (request !== activationRequest) return;
      gardens.value = nextGardens;

      const stored =
        typeof localStorage === 'undefined'
          ? undefined
          : localStorage.getItem(ACTIVE_GARDEN_KEY) || undefined;
      const id =
        stored && nextGardens.some((garden) => garden.id === stored)
          ? stored
          : nextGardens[0]?.id;
      if (id) {
        const garden = await gardensApi.fetchGarden(id);
        commitGarden(garden, request);
      } else {
        persistActiveId(undefined);
      }
    })();
    bootstrapInFlight = operation;
    try {
      await operation;
    } finally {
      if (bootstrapInFlight === operation) {
        isBootstrapping.value = false;
        bootstrapInFlight = null;
      }
    }
  };

  const save = async () => {
    const id = gardenId.value;
    if (!canSave.value || !id) return;

    const generation = sessionGeneration.value;
    saving.value = true;
    errorMessage.value = undefined;
    const stateAtStart = plan.capture();
    const { backgroundImage: image, ...data } = buildDocument(stateAtStart);
    const document: GardenDocumentPayload =
      image === savedState.value?.backgroundImageDataUrl
        ? data
        : { ...data, backgroundImage: image ?? null };
    const isCurrentSave = () =>
      generation === sessionGeneration.value && gardenId.value === id;
    try {
      const revision = await gardensApi.updateGarden(id, document);
      if (!isCurrentSave()) {
        return;
      }
      syncRevision.value = revision;
      savedState.value = stateAtStart;
      await refreshList().catch(() => undefined);
    } catch (error) {
      if (isCurrentSave()) {
        if (error instanceof ApiError && error.status === 409) {
          errorMessage.value =
            'Your garden was updated elsewhere. Your changes are still here but have not been saved. Download your plan before reloading the latest copy.';
        } else if (error instanceof ApiError && error.status === 503) {
          errorMessage.value =
            'The server is busy. Your changes are still here. Please retry saving in a moment.';
        } else if (error instanceof ApiError && error.status === 413) {
          errorMessage.value =
            'Your garden is too large to save. Try a smaller background image. Your changes are still here but have not been saved.';
        } else {
          errorMessage.value =
            'Your garden could not be saved. Your changes are still here. Please try again.';
        }
      }
    } finally {
      if (isCurrentSave()) {
        saving.value = false;
      }
    }
  };

  const confirmLeave = () =>
    !hasUnsavedChanges.value ||
    window.confirm('You have unsaved changes. Leave without saving?');

  const reset = () => {
    activationRequest += 1;
    listRequest += 1;
    bootstrapInFlight = null;
    isBootstrapping.value = true;
    loading.value = false;
    saving.value = false;
    errorMessage.value = undefined;
    savedState.value = undefined;
    gardens.value = [];
    persistActiveId(undefined);
    const { backgroundImageDataUrl: _image, ...data } = createEmptyPlanState();
    hydrateFromDocument({
      ...data,
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: 0,
    });
  };

  return {
    documentGeneration: computed(() => sessionGeneration.value),
    gardenId,
    gardenName,
    syncRevision,
    snapshot,
    hydrateFromDocument,
    gardens,
    loading,
    isBootstrapping,
    status,
    errorMessage,
    details,
    hasUnsavedChanges,
    canSave,
    refreshList,
    activateGarden,
    activateGardenRecord,
    createEmptyGarden,
    bootstrap,
    save,
    markSaved,
    confirmLeave,
    reset,
  };
});
