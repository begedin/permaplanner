import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { ApiError } from '../api/client';
import * as gardensApi from '../api/gardens';
import type { GardenRecord, GardenSummary } from '../api/gardens';
import {
  capturePlanSavableState,
  planSavableStatesEqual,
  type PlanSavableState,
} from '../planSavableState';
import { usePermaplannerStore } from '../usePermaplannerStore';
import { useAuthStore } from './useAuthStore';

const ACTIVE_GARDEN_KEY = 'permaplanner.activeGardenId';

const formatTimestamp = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export type PlanSaveStatus = 'inactive' | 'unsaved' | 'saving' | 'saved' | 'error';

export const useGardenSessionStore = defineStore('gardenSession', () => {
  const permaplanner = usePermaplannerStore();
  const auth = useAuthStore();

  const gardens = ref<GardenSummary[]>([]);
  const loading = ref(false);
  const isBootstrapping = ref(true);
  const saving = ref(false);
  const errorMessage = ref<string>();
  const savedState = shallowRef<PlanSavableState>();

  let sessionGeneration = 0;
  let activationRequest = 0;
  let listRequest = 0;
  let saveRequest = 0;
  let bootstrapInFlight: Promise<void> | null = null;

  const isSaveAvailable = computed(() =>
    Boolean(auth.user?.totpConfirmed && permaplanner.gardenId),
  );
  const hasUnsavedChanges = computed(
    () =>
      isSaveAvailable.value &&
      savedState.value !== undefined &&
      (saving.value ||
        !planSavableStatesEqual(savedState.value, capturePlanSavableState())),
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
    if (permaplanner.gardenName) {
      rows.push({ label: 'Garden', value: permaplanner.gardenName });
    }
    const summary = gardens.value.find((garden) => garden.id === permaplanner.gardenId);
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
    savedState.value = capturePlanSavableState();
    errorMessage.value = undefined;
  };

  const commitGarden = async (
    garden: GardenRecord,
    request: number,
  ): Promise<boolean> => {
    if (request !== activationRequest) return false;

    await permaplanner.hydrateFromDocument(garden.document, {
      id: garden.id,
      name: garden.name,
    });
    if (request !== activationRequest) return false;

    sessionGeneration += 1;
    saveRequest += 1;
    saving.value = false;
    markSaved();
    persistActiveId(garden.id);
    return true;
  };

  const refreshList = async () => {
    const generation = sessionGeneration;
    const request = ++listRequest;
    loading.value = true;
    try {
      const nextGardens = await gardensApi.listGardens();
      if (generation === sessionGeneration && request === listRequest) {
        gardens.value = nextGardens;
      }
    } finally {
      if (generation === sessionGeneration && request === listRequest) {
        loading.value = false;
      }
    }
  };

  const activateGarden = async (id: string) => {
    const request = ++activationRequest;
    const garden = await gardensApi.fetchGarden(id);
    await commitGarden(garden, request);
    return garden;
  };

  const activateGardenRecord = async (garden: GardenRecord) => {
    const request = ++activationRequest;
    await commitGarden(garden, request);
  };

  const createEmptyGarden = async (name?: string) => {
    const request = ++activationRequest;
    const garden = await gardensApi.createGarden(name);
    const committed = await commitGarden(garden, request);
    if (committed) {
      await refreshList().catch(() => undefined);
    }
    return garden;
  };

  const bootstrap = async () => {
    if (bootstrapInFlight) return bootstrapInFlight;

    isBootstrapping.value = true;
    const generation = sessionGeneration;
    const request = ++activationRequest;
    const operation = (async () => {
      try {
        const nextGardens = await gardensApi.listGardens();
        if (generation !== sessionGeneration || request !== activationRequest) return;
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
          await commitGarden(garden, request);
        } else {
          persistActiveId(undefined);
        }
      } finally {
        if (request === activationRequest) {
          isBootstrapping.value = false;
        }
      }
    })();
    bootstrapInFlight = operation;
    try {
      await operation;
    } finally {
      if (bootstrapInFlight === operation) {
        bootstrapInFlight = null;
      }
    }
  };

  const save = async () => {
    const id = permaplanner.gardenId;
    if (!canSave.value || !id) return;

    const generation = sessionGeneration;
    const request = ++saveRequest;
    saving.value = true;
    errorMessage.value = undefined;
    const stateAtStart = capturePlanSavableState();
    const document = permaplanner.snapshotForServer();
    const isCurrentSave = () =>
      generation === sessionGeneration &&
      request === saveRequest &&
      permaplanner.gardenId === id;
    try {
      const syncRevision = await gardensApi.updateGarden(id, document);
      if (!isCurrentSave()) {
        return;
      }
      permaplanner.setSyncRevision(syncRevision);
      permaplanner.backgroundImageSavedDataUrl = stateAtStart.backgroundImageDataUrl;
      savedState.value = stateAtStart;
      await refreshList().catch(() => undefined);
    } catch (error) {
      if (isCurrentSave()) {
        if (error instanceof ApiError && error.status === 409) {
          errorMessage.value =
            'Your garden was updated elsewhere. Your changes are still here but have not been saved. Download your plan before reloading the latest copy.';
        } else if (error instanceof Error) {
          errorMessage.value = error.message;
        } else {
          errorMessage.value = String(error);
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

  const reset = async () => {
    activationRequest += 1;
    listRequest += 1;
    saveRequest += 1;
    sessionGeneration += 1;
    bootstrapInFlight = null;
    isBootstrapping.value = true;
    loading.value = false;
    saving.value = false;
    errorMessage.value = undefined;
    savedState.value = undefined;
    gardens.value = [];
    persistActiveId(undefined);
    await permaplanner.resetToNewPlan();
  };

  return {
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
