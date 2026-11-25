import { nextTick, ref, watch, type Ref } from 'vue';

import { useGuildSelection } from './useGuildSelection';

export const useGuildListScroll = (visible: Ref<boolean>) => {
  const guildListScroll = ref<HTMLElement>();
  const { selectedGuildId } = useGuildSelection();

  watch(
    [selectedGuildId, visible],
    async ([id, isVisible]) => {
      if (!id || !isVisible) {
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
