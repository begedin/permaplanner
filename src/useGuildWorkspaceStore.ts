import { useMediaQuery } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import type { CameraFocus } from './useCameraViewport';

type GuildPane = { kind: 'details' } | { kind: 'map'; focus?: CameraFocus };

export const useGuildWorkspaceStore = defineStore('guildWorkspace', () => {
  const compact = useMediaQuery('(width < 1024px)');
  const listOpen = ref(false);
  const pane = shallowRef<GuildPane>();
  const drawerOpen = computed(() => compact.value && listOpen.value);
  const listVisible = computed(() => !compact.value || listOpen.value);
  const detailsSelected = computed(() => pane.value?.kind === 'details');
  const mapVisibility = computed(() => {
    if (!pane.value) return 'absent';
    if (compact.value && (listOpen.value || detailsSelected.value)) return 'hidden';
    return 'visible';
  });
  const aerialFocus = computed(() =>
    compact.value && pane.value?.kind === 'map' ? pane.value.focus : undefined,
  );

  function showMap(focus?: CameraFocus) {
    pane.value = { kind: 'map', focus };
  }
  function showDetails() {
    pane.value = { kind: 'details' };
  }
  function leave() {
    listOpen.value = false;
    pane.value = undefined;
  }

  return {
    compact,
    listOpen,
    pane,
    drawerOpen,
    listVisible,
    detailsSelected,
    mapVisibility,
    aerialFocus,
    showMap,
    showDetails,
    leave,
  };
});
