import { computed, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const useBackgroundImage = () => {
  const permaplannerStore = usePermaplannerStore();
  const ready = ref(false);

  const imgWidth = ref(0);
  const imgHeight = ref(0);

  const imgDataUrl = computed(() => permaplannerStore.backgroundImageDataUrl);

  const setDimensions = (img: HTMLImageElement): void => {
    imgWidth.value = img.naturalWidth;
    imgHeight.value = img.naturalHeight;
    ready.value = true;
  };

  const setImage = async (dataUrl: string) => {
    ready.value = false;
    const img = document.createElement('img');
    img.src = dataUrl;

    document.body.appendChild(img);
    return new Promise((resolve) => {
      if (img.complete) {
        setDimensions(img);
        img.remove();
        resolve(undefined);
      } else {
        img.onload = () => {
          setDimensions(img);
          img.remove();
          resolve(undefined);
        };
      }
    });
  };

  watch(
    () => permaplannerStore.backgroundImageDataUrl,
    (dataUrl) => dataUrl && setImage(dataUrl),
    { immediate: true },
  );

  useEventListener(document, 'paste', (e) => {
    const file = e.clipboardData?.items[0]?.getAsFile();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      usePlanCommandHistory().runMutation(() => {
        permaplannerStore.backgroundImageDataUrl = reader.result as string;
      });
    };
    reader.readAsDataURL(file);
  });

  return {
    imgWidth,
    imgHeight,
    imgDataUrl,
    ready,
  };
};
