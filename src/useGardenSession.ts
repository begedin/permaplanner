import { ref } from 'vue';

import * as gardensApi from './api/gardens';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';

export const isGardenBootstrapping = ref(true);

let bootstrapInFlight: Promise<void> | null = null;

export const resetGardenSession = async () => {
  bootstrapInFlight = null;
  isGardenBootstrapping.value = true;
  useGardenSessionStore().clearSession();
  await usePermaplannerStore().resetToNewPlan();
};

export const bootstrapGardenSession = async () => {
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }

  isGardenBootstrapping.value = true;
  bootstrapInFlight = (async () => {
    const gardenSession = useGardenSessionStore();
    const permaplannerStore = usePermaplannerStore();
    const planSaveCoordinator = usePlanSaveCoordinator();

    try {
      await gardenSession.loadGardenList();
      const id = gardenSession.activeGardenId;
      if (id) {
        const garden = await gardensApi.fetchGarden(id);
        await permaplannerStore.hydrateFromDocument(garden.document, {
          id: garden.id,
          name: garden.name,
        });
        planSaveCoordinator.markIntegrationsSaved();
      }
    } finally {
      isGardenBootstrapping.value = false;
    }
  })();

  try {
    await bootstrapInFlight;
  } finally {
    bootstrapInFlight = null;
  }
};

export const useGardenSession = () => {
  const permaplannerStore = usePermaplannerStore();
  const gardenSession = useGardenSessionStore();
  const planSaveCoordinator = usePlanSaveCoordinator();

  const loadActiveGarden = async () => {
    const id = gardenSession.activeGardenId;
    if (!id) {
      return;
    }
    const garden = await gardensApi.fetchGarden(id);
    await permaplannerStore.hydrateFromDocument(garden.document, {
      id: garden.id,
      name: garden.name,
    });
    planSaveCoordinator.markIntegrationsSaved();
  };

  const createEmptyGarden = async (name?: string) => {
    const garden = await gardensApi.createGarden(name);
    await gardenSession.refreshList();
    gardenSession.setActiveGardenId(garden.id);
    await permaplannerStore.hydrateFromDocument(garden.document, {
      id: garden.id,
      name: garden.name,
    });
    planSaveCoordinator.markIntegrationsSaved();
    return garden;
  };

  const activateGarden = async (id: string) => {
    gardenSession.setActiveGardenId(id);
    await loadActiveGarden();
  };

  return {
    isGardenBootstrapping,
    loadActiveGarden,
    createEmptyGarden,
    activateGarden,
  };
};
