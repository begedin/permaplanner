import { computed, shallowRef, watch } from 'vue';
import { defaultMapSize, type MapSize } from './aerialMapBounds';
import { usePermaplannerStore } from './usePermaplannerStore';

export const useBackgroundImage = () => {
  const permaplanner = usePermaplannerStore();
  const mapSize = shallowRef<MapSize>();
  const imgDataUrl = computed(() => permaplanner.backgroundImageDataUrl);

  watch(
    imgDataUrl,
    (dataUrl, _previous, onCleanup) => {
      mapSize.value = dataUrl ? undefined : defaultMapSize;
      if (!dataUrl) return;

      const img = new Image();
      let active = true;
      onCleanup(() => {
        active = false;
        img.onload = null;
        img.removeAttribute('src');
      });
      img.onload = () => {
        if (active && img.naturalWidth > 0 && img.naturalHeight > 0)
          mapSize.value = { width: img.naturalWidth, height: img.naturalHeight };
      };
      img.src = dataUrl;
    },
    { immediate: true, flush: 'sync' },
  );

  return { imgDataUrl, mapSize };
};
