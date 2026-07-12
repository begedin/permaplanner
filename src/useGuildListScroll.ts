import { nextTick, ref, watch } from 'vue';

import { useGuildSelection } from './useGuildSelection';

export const useGuildListScroll = () => {
  const guildListScroll = ref<HTMLElement>();
  const { selectedGuildId } = useGuildSelection();

  watch(
    selectedGuildId,
    async (id) => {
      if (!id) {
        return;
      }
      await nextTick();
      const list = guildListScroll.value;
      if (!list) {
        return;
      }
      list
        .querySelector(`[data-guild-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    { immediate: true },
  );

  return { guildListScroll };
};
