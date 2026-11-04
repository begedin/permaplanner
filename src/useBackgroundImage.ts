import { computed, ref, watch } from 'vue';
import { usePermaplannerStore } from './usePermaplannerStore';

export const useBackgroundImage = () => {
  const permaplanner = usePermaplannerStore();
  const ready = ref(false);
  const imgWidth = ref(0);
  const imgHeight = ref(0);
  const imgDataUrl = computed(() => permaplanner.backgroundImageDataUrl);

  watch(
    imgDataUrl,
    (dataUrl, _previous, onCleanup) => {
      ready.value = false;
      imgWidth.value = 0;
      imgHeight.value = 0;
      if (!dataUrl) return;

      const img = new Image();
      let active = true;
      onCleanup(() => {
        active = false;
        img.onload = null;
        img.onerror = null;
        img.removeAttribute('src');
      });
      img.onload = () => {
        if (!active) return;
        imgWidth.value = img.naturalWidth;
        imgHeight.value = img.naturalHeight;
        ready.value = imgWidth.value > 0 && imgHeight.value > 0;
      };
      img.onerror = () => {
        if (!active) return;
        imgWidth.value = 0;
        imgHeight.value = 0;
        ready.value = false;
      };
      img.src = dataUrl;
    },
    { immediate: true, flush: 'sync' },
  );

  return { imgWidth, imgHeight, imgDataUrl, ready };
};
