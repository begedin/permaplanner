import { onScopeDispose, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const MAX_BACKGROUND_IMAGE_BYTES = 3_000_000;

export const useBackgroundImagePaste = () => {
  const permaplanner = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const errorMessage = ref<string>();
  let reader: FileReader | undefined;

  const cancel = () => {
    errorMessage.value = undefined;
    if (!reader) return;
    reader.onload = null;
    reader.abort();
    reader = undefined;
  };
  onScopeDispose(cancel);
  watch(() => [permaplanner.gardenId, permaplanner.isBulkPlanUpdate], cancel, {
    flush: 'sync',
  });

  useEventListener(document, 'paste', (event) => {
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (!file) return;
    cancel();
    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      errorMessage.value =
        'Background image is too large. Paste an image of 3 MB or less. Resize or compress it and try again.';
      return;
    }
    const pending = new FileReader();
    reader = pending;
    pending.onload = () => {
      if (reader !== pending || typeof pending.result !== 'string') return;
      const dataUrl = pending.result;
      reader = undefined;
      history.runMutation(() => {
        permaplanner.backgroundImageDataUrl = dataUrl;
      });
    };
    pending.readAsDataURL(file);
  });

  return { errorMessage };
};
