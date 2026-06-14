import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as gardensApi from '../api/gardens';
import type { GardenSummary } from '../api/gardens';

const ACTIVE_GARDEN_KEY = 'permaplanner.activeGardenId';

export const useGardenSessionStore = defineStore('gardenSession', () => {
  const gardens = ref<GardenSummary[]>([]);
  const activeGardenId = ref<string | undefined>();
  const loading = ref(false);

  const readStoredActiveId = (): string | undefined => {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }
    const id = localStorage.getItem(ACTIVE_GARDEN_KEY);
    return id && id.length > 0 ? id : undefined;
  };

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

  const loadGardenList = async () => {
    loading.value = true;
    try {
      gardens.value = await gardensApi.listGardens();
      const stored = readStoredActiveId();
      const match = stored && gardens.value.some((g) => g.id === stored);
      activeGardenId.value = match ? stored : gardens.value[0]?.id;
      if (activeGardenId.value) {
        persistActiveId(activeGardenId.value);
      }
    } finally {
      loading.value = false;
    }
  };

  const setActiveGardenId = (id: string) => {
    activeGardenId.value = id;
    persistActiveId(id);
  };

  const refreshList = async () => {
    gardens.value = await gardensApi.listGardens();
  };

  const clearSession = () => {
    gardens.value = [];
    activeGardenId.value = undefined;
    loading.value = false;
    persistActiveId(undefined);
  };

  return {
    gardens,
    activeGardenId,
    loading,
    loadGardenList,
    setActiveGardenId,
    refreshList,
    clearSession,
  };
});
