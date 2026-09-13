import { useEventListener } from '@vueuse/core';
import { computed } from 'vue';

import { useGardenStore } from './useGardenStore';

export const useGuildMergeMode = () => {
  const garden = useGardenStore();
  const isMerging = computed(() => Boolean(garden.mergeSourceId));

  useEventListener(
    window,
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !isMerging.value) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      garden.mergeSourceId = undefined;
    },
    { capture: true },
  );

  return { isMerging };
};
