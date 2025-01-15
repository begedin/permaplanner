import { computed, ref, watch } from 'vue';
import { usePermaplannerStore } from './usePermaplannerStore';

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

  let pasteController: AbortController | null = null;

  const setupBackgroundImagePaste = () => {
    pasteController = new AbortController();

    document.addEventListener(
      'paste',
      async (e) => {
        if (!e.clipboardData || !e.clipboardData.items) return;
        const file = e.clipboardData.items[0].getAsFile();
        if (!file) {
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          permaplannerStore.backgroundImageDataUrl = reader.result as string;
        };
      },

      { signal: pasteController.signal },
    );
  };

  const teardownBackgroundImagePaste = () => pasteController?.abort();

  return {
    setImage,
    setupBackgroundImagePaste,
    teardownBackgroundImagePaste,
    imgWidth,
    imgHeight,
    imgDataUrl,
    ready,
  };
};
