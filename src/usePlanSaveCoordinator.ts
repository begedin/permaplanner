import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { ApiError } from './api/client';
import * as gardensApi from './api/gardens';
import { runPlanSaveSerial } from './planSaveSerialQueue';
import { useAuthStore } from './stores/useAuthStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { usePermaplannerStore } from './usePermaplannerStore';

export type PlanSaveStatus = 'inactive' | 'unsaved' | 'saving' | 'saved' | 'error';

export type PlanSaveDetailRow =
  | { kind: 'text'; label: string; value: string }
  | { kind: 'link'; label: string; href: string };

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

const AUTOSAVE_DEBOUNCE_MS = import.meta.env.VITEST ? 50 : 5000;

const formatTimestamp = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export const usePlanSaveCoordinator = defineStore('planSaveCoordinator', () => {
  const permaplannerStore = usePermaplannerStore();
  const authStore = useAuthStore();

  const saving = ref(false);
  const errorMessage = ref<string | undefined>();
  const details = ref<PlanSaveDetailRow[]>([]);
  const detailsExpanded = ref(false);
  const trackingEnabled = ref(false);
  const editGeneration = ref(0);
  const savedAtGeneration = ref<number | undefined>();

  let inFlightFlush: Promise<void> | null = null;
  let autosaveTrailingTimer: ReturnType<typeof setTimeout> | undefined;
  let autosaveBurstActive = false;

  const isSaveAvailable = (): boolean => Boolean(authStore.user?.totpConfirmed);
  const isLinked = (): boolean => Boolean(permaplannerStore.gardenId);

  const isDirty = (): boolean => {
    if (!trackingEnabled.value || !isSaveAvailable() || !isLinked()) {
      return false;
    }
    return savedAtGeneration.value !== editGeneration.value;
  };

  const status = computed((): PlanSaveStatus => {
    void editGeneration.value;
    void savedAtGeneration.value;
    if (!isSaveAvailable() || !isLinked()) {
      return 'inactive';
    }
    if (saving.value) {
      return 'saving';
    }
    if (errorMessage.value) {
      return 'error';
    }
    if (isDirty()) {
      return 'unsaved';
    }
    return 'saved';
  });

  const hasUnsavedChanges = computed(
    () => status.value === 'unsaved' || status.value === 'error',
  );

  const refreshDetails = async () => {
    if (!isSaveAvailable()) {
      return;
    }
    try {
      const rows: PlanSaveDetailRow[] = [];
      const name = permaplannerStore.gardenName;
      if (name) {
        rows.push({ kind: 'text', label: 'Garden', value: name });
      }
      const summary = useGardenSessionStore().gardens.find(
        (g) => g.id === permaplannerStore.gardenId,
      );
      rows.push({
        kind: 'text',
        label: 'Last saved',
        value: formatTimestamp(summary?.updatedAt),
      });
      details.value = rows;
    } catch {
      /* details are best-effort */
    }
  };

  const markSaved = (savedGeneration: number = editGeneration.value) => {
    if (!isLinked()) {
      trackingEnabled.value = true;
      return;
    }
    savedAtGeneration.value = savedGeneration;
    errorMessage.value = undefined;
    trackingEnabled.value = true;
  };

  const noteSaved = (savedGeneration: number = editGeneration.value) => {
    if (!isLinked()) {
      return;
    }
    savedAtGeneration.value = savedGeneration;
    errorMessage.value = undefined;
    saving.value = false;
    void refreshDetails();
  };

  const cancelAutosaveTrailing = () => {
    if (autosaveTrailingTimer !== undefined) {
      clearTimeout(autosaveTrailingTimer);
      autosaveTrailingTimer = undefined;
    }
    autosaveBurstActive = false;
  };

  const scheduleAutosaveFlush = () => {
    if (autosaveTrailingTimer !== undefined) {
      clearTimeout(autosaveTrailingTimer);
      autosaveTrailingTimer = undefined;
    }

    if (!autosaveBurstActive) {
      autosaveBurstActive = true;
      scheduleFlush();
    }

    autosaveTrailingTimer = setTimeout(() => {
      autosaveBurstActive = false;
      autosaveTrailingTimer = undefined;
      scheduleFlush();
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const saveGardenToServer = async () => {
    const id = permaplannerStore.gardenId;
    if (!id) {
      throw new Error('No active garden selected.');
    }
    const document = permaplannerStore.snapshotForServer();
    try {
      const syncRevision = await gardensApi.updateGarden(id, document);
      permaplannerStore.setSyncRevision(syncRevision);
      permaplannerStore.noteBackgroundImageSaved();
      await useGardenSessionStore().refreshList();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const fresh = await gardensApi.fetchGarden(id);
        await permaplannerStore.hydrateFromDocument(fresh.document, {
          id: fresh.id,
          name: fresh.name,
        });
        permaplannerStore.noteBackgroundImageSaved();
        throw new Error(
          'Your garden was updated elsewhere. Loaded the latest copy — review and save again.',
        );
      }
      throw e;
    }
  };

  const saveNowInternal = async (options?: { force?: boolean }) => {
    if (!isSaveAvailable() || !isLinked()) {
      return;
    }
    if (!options?.force && !isDirty()) {
      return;
    }

    saving.value = true;
    errorMessage.value = undefined;
    const generationAtStart = editGeneration.value;

    try {
      await saveGardenToServer();
      noteSaved(generationAtStart);
    } catch (e) {
      if (!options?.force) {
        cancelAutosaveTrailing();
      }
      const message = e instanceof Error ? e.message : String(e);
      saving.value = false;
      errorMessage.value = message;
      throw e;
    }
  };

  const saveNow = (): Promise<void> =>
    runPlanSaveSerial(() => saveNowInternal({ force: true }));

  const flushAutosave = async () => {
    if (!trackingEnabled.value || permaplannerStore.suppressAutosaveDepth > 0) {
      return;
    }
    if (!isDirty()) {
      return;
    }
    await saveNowInternal();
  };

  const scheduleFlush = (): Promise<void> => {
    if (!isDirty()) {
      return Promise.resolve();
    }
    inFlightFlush ??= runPlanSaveSerial(async () => {
      try {
        await flushAutosave();
      } finally {
        inFlightFlush = null;
      }
    });
    return inFlightFlush;
  };

  const retry = () => {
    void saveNow();
  };

  const toggleDetailsExpanded = () => {
    detailsExpanded.value = !detailsExpanded.value;
    if (detailsExpanded.value) {
      void refreshDetails();
    }
  };

  watch(
    () => permaplannerStore.gardenId,
    () => {
      void refreshDetails();
    },
    { flush: 'post' },
  );

  const onEditApplied = () => {
    if (!trackingEnabled.value) {
      return;
    }
    if (
      permaplannerStore.suppressAutosaveDepth > 0 ||
      permaplannerStore.isBulkPlanUpdate
    ) {
      return;
    }
    editGeneration.value += 1;
    scheduleAutosaveFlush();
  };

  return {
    status,
    errorMessage,
    details,
    detailsExpanded,
    hasUnsavedChanges,
    toggleDetailsExpanded,
    retry,
    saveNow,
    scheduleFlush,
    refreshDetails,
    markSaved,
    onEditApplied,
  };
});
