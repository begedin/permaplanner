import { ref } from 'vue';

const hoveredId = ref<string | undefined>();

export const useGuildHover = () => {
  const clearHover = () => {
    hoveredId.value = undefined;
  };

  const clearHoverIf = (id: string) => {
    if (hoveredId.value === id) {
      hoveredId.value = undefined;
    }
  };

  return { hoveredId, clearHover, clearHoverIf };
};
