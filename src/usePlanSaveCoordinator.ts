import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import type {
  PlanSaveIntegrationId,
  PlanSaveIntegrationStatus,
  PlanSaveIntegrationView,
} from './planSaveIntegration';
import { planSaveIntegrations } from './planSaveIntegrations';
import { runPlanSaveSerial } from './planSaveSerialQueue';
import { usePermaplannerStore } from './usePermaplannerStore';

type IntegrationRuntime = {
  errorMessage?: string;
  details: PlanSaveIntegrationView['details'];
  saving: boolean;
};

const defaultRuntime = (): IntegrationRuntime => ({
  details: [],
  saving: false,
});

const AUTOSAVE_DEBOUNCE_MS = import.meta.env.VITEST ? 50 : 5000;

export const usePlanSaveCoordinator = defineStore('planSaveCoordinator', () => {
  const permaplannerStore = usePermaplannerStore();

  const runtimeById = ref<Record<PlanSaveIntegrationId, IntegrationRuntime>>({
    server: defaultRuntime(),
  });

  const expandedIds = ref<Set<PlanSaveIntegrationId>>(new Set());
  const trackingEnabled = ref(false);
  const editGeneration = ref(0);
  const savedAtGenerationById = ref<Partial<Record<PlanSaveIntegrationId, number>>>({});

  const saveContext = () => ({
    snapshot: () => permaplannerStore.snapshot(),
    gardenName: () => permaplannerStore.gardenName,
  });

  const integrationFor = (id: PlanSaveIntegrationId) => {
    const integration = planSaveIntegrations.find((i) => i.id === id);
    if (!integration) {
      throw new Error(`Unknown plan save integration: ${id}`);
    }
    return integration;
  };

  const setRuntime = (id: PlanSaveIntegrationId, patch: Partial<IntegrationRuntime>) => {
    runtimeById.value = {
      ...runtimeById.value,
      [id]: { ...runtimeById.value[id]!, ...patch },
    };
  };

  const isIntegrationDirty = (id: PlanSaveIntegrationId): boolean => {
    if (!trackingEnabled.value) {
      return false;
    }
    const integration = integrationFor(id);
    if (!integration.isAvailable() || !integration.isLinked()) {
      return false;
    }
    return savedAtGenerationById.value[id] !== editGeneration.value;
  };

  const integrationStatus = (id: PlanSaveIntegrationId): PlanSaveIntegrationStatus => {
    const integration = integrationFor(id);
    if (!integration.isAvailable() || !integration.isLinked()) {
      return 'inactive';
    }
    const runtime = runtimeById.value[id]!;
    if (runtime.saving) {
      return 'saving';
    }
    if (runtime.errorMessage) {
      return 'error';
    }
    if (isIntegrationDirty(id)) {
      return 'unsaved';
    }
    return 'saved';
  };

  const refreshDetails = async (id: PlanSaveIntegrationId) => {
    const integration = integrationFor(id);
    if (!integration.isAvailable()) {
      return;
    }
    try {
      const details = await integration.loadDetails(saveContext());
      setRuntime(id, { details });
    } catch {
      /* details are best-effort */
    }
  };

  const refreshAllDetails = async () => {
    await Promise.all(
      planSaveIntegrations.filter((i) => i.isAvailable()).map((i) => refreshDetails(i.id)),
    );
  };

  const markIntegrationsSaved = (ids?: PlanSaveIntegrationId[]) => {
    const targets =
      ids ??
      planSaveIntegrations
        .filter((i) => i.isAvailable() && i.isLinked())
        .map((i) => i.id);
    const next = { ...savedAtGenerationById.value };
    for (const id of targets) {
      next[id] = editGeneration.value;
      setRuntime(id, { errorMessage: undefined });
    }
    savedAtGenerationById.value = next;
    trackingEnabled.value = true;
  };

  const noteDestinationSaved = (
    id: PlanSaveIntegrationId,
    savedGeneration: number = editGeneration.value,
  ) => {
    if (!integrationFor(id).isLinked()) {
      return;
    }
    savedAtGenerationById.value = {
      ...savedAtGenerationById.value,
      [id]: savedGeneration,
    };
    setRuntime(id, { errorMessage: undefined, saving: false });
    void refreshDetails(id);
  };

  let inFlightFlush: Promise<void> | null = null;
  let autosaveTrailingTimer: ReturnType<typeof setTimeout> | undefined;
  let autosaveBurstActive = false;

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

  const saveIntegrationNow = async (id: PlanSaveIntegrationId) => {
    const integration = integrationFor(id);
    if (!integration.isAvailable() || !integration.isLinked()) {
      return;
    }

    setRuntime(id, { saving: true, errorMessage: undefined });
    const generationAtStart = editGeneration.value;

    try {
      await integration.save(saveContext());
      noteDestinationSaved(id, generationAtStart);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setRuntime(id, { saving: false, errorMessage: message });
      throw e;
    }
  };

  const saveIntegration = (id: PlanSaveIntegrationId): Promise<void> =>
    runPlanSaveSerial(() => saveIntegrationNow(id));

  const anyDirty = (): boolean =>
    planSaveIntegrations.some(
      (i) => i.isAvailable() && i.isLinked() && isIntegrationDirty(i.id),
    );

  const flushLinkedSavesNow = async (options?: { force?: boolean }) => {
    if (!trackingEnabled.value || permaplannerStore.suppressAutosaveDepth > 0) {
      return;
    }
    if (!options?.force && !anyDirty()) {
      return;
    }

    const linked = planSaveIntegrations.filter((i) => i.isAvailable() && i.isLinked());
    for (const integration of linked) {
      if (!options?.force && !isIntegrationDirty(integration.id)) {
        continue;
      }
      await saveIntegrationNow(integration.id);
    }
  };

  const saveAllLinkedIntegrations = (): Promise<void> =>
    runPlanSaveSerial(() => flushLinkedSavesNow({ force: true }));

  const scheduleFlush = (): Promise<void> => {
    if (!anyDirty()) {
      return Promise.resolve();
    }
    inFlightFlush ??= runPlanSaveSerial(async () => {
      try {
        await flushLinkedSavesNow();
      } finally {
        inFlightFlush = null;
      }
    });
    return inFlightFlush;
  };

  const retry = (id: PlanSaveIntegrationId) => {
    void saveIntegration(id);
  };

  const toggleExpanded = (id: PlanSaveIntegrationId) => {
    const next = new Set(expandedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      void refreshDetails(id);
    }
    expandedIds.value = next;
  };

  const isExpanded = (id: PlanSaveIntegrationId) => expandedIds.value.has(id);

  const views = computed((): PlanSaveIntegrationView[] => {
    void editGeneration.value;
    void savedAtGenerationById.value;
    return planSaveIntegrations
      .filter((i) => i.isAvailable())
      .map((integration) => {
        const runtime = runtimeById.value[integration.id]!;
        return {
          id: integration.id,
          label: integration.label,
          status: integrationStatus(integration.id),
          errorMessage: runtime.errorMessage,
          details: runtime.details,
        };
      });
  });

  const hasUnsavedChanges = computed(() =>
    views.value.some((v) => v.status === 'unsaved' || v.status === 'error'),
  );

  watch(
    () => permaplannerStore.gardenId,
    () => {
      void refreshAllDetails();
    },
    { flush: 'post' },
  );

  const onEditApplied = () => {
    if (!trackingEnabled.value) {
      return;
    }
    if (permaplannerStore.suppressAutosaveDepth > 0 || permaplannerStore.isBulkPlanUpdate) {
      return;
    }
    editGeneration.value += 1;
    scheduleAutosaveFlush();
  };

  return {
    views,
    hasUnsavedChanges,
    expandedIds,
    isExpanded,
    toggleExpanded,
    retry,
    saveIntegration,
    saveAllLinkedIntegrations,
    scheduleFlush,
    refreshDetails,
    refreshAllDetails,
    markIntegrationsSaved,
    noteDestinationSaved,
    onEditApplied,
  };
});
