import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import {
  capturePlanSavableState,
  planSavableStatesEqual,
  type PlanSavableState,
} from './planSavableState';

import { ApiError } from './api/client';
import * as gardensApi from './api/gardens';
import { useAuthStore } from './stores/useAuthStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { usePermaplannerStore } from './usePermaplannerStore';

export type PlanSaveStatus = 'inactive' | 'unsaved' | 'saving' | 'saved' | 'error';

export const planSaveStatusLabel = (status: PlanSaveStatus): string => {
  switch (status) {
    case 'inactive':
      return 'Off';
    case 'unsaved':
      return 'Unsaved';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Failed';
  }
};

const formatTimestamp = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export const usePlanSaveCoordinator = defineStore('planSaveCoordinator', () => {
  const permaplannerStore = usePermaplannerStore();
  const authStore = useAuthStore();
  const gardenSession = useGardenSessionStore();

  const saving = ref(false);
  const errorMessage = ref<string | undefined>();
  const savedState = shallowRef<PlanSavableState>();

  const isSaveAvailable = computed(() =>
    Boolean(authStore.user?.totpConfirmed && permaplannerStore.gardenId),
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
    if (!isSaveAvailable.value) {
      return 'inactive';
    }
    if (saving.value) {
      return 'saving';
    }
    if (errorMessage.value) {
      return 'error';
    }
    if (hasUnsavedChanges.value) {
      return 'unsaved';
    }
    return 'saved';
  });

  const details = computed(() => {
    const rows: { label: string; value: string }[] = [];
    const name = permaplannerStore.gardenName;
    if (name) rows.push({ label: 'Garden', value: name });
    const summary = gardenSession.gardens.find(
      (garden) => garden.id === permaplannerStore.gardenId,
    );
    rows.push({ label: 'Last saved', value: formatTimestamp(summary?.updatedAt) });
    return rows;
  });

  const markSaved = () => {
    savedState.value = capturePlanSavableState();
    errorMessage.value = undefined;
  };

  const save = async () => {
    const id = permaplannerStore.gardenId;
    if (!canSave.value || !id) return;

    saving.value = true;
    errorMessage.value = undefined;
    const stateAtStart = capturePlanSavableState();
    const document = permaplannerStore.snapshotForServer();
    try {
      const syncRevision = await gardensApi.updateGarden(id, document);
      permaplannerStore.setSyncRevision(syncRevision);
      permaplannerStore.backgroundImageSavedDataUrl = stateAtStart.backgroundImageDataUrl;
      savedState.value = stateAtStart;
      // A list refresh failure must not turn a successful save into a save error.
      await gardenSession.refreshList().catch(() => undefined);
    } catch (e) {
      errorMessage.value =
        e instanceof ApiError && e.status === 409
          ? 'Your garden was updated elsewhere. Your changes are still here but have not been saved. Download your plan before reloading the latest copy.'
          : e instanceof Error
            ? e.message
            : String(e);
    } finally {
      saving.value = false;
    }
  };

  const confirmLeave = () =>
    !hasUnsavedChanges.value ||
    window.confirm('You have unsaved changes. Leave without saving?');

  return {
    status,
    errorMessage,
    details,
    hasUnsavedChanges,
    canSave,
    confirmLeave,
    save,
    markSaved,
  };
});
