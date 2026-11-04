import { onScopeDispose, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const useBackgroundImagePaste = () => {
  const permaplanner = usePermaplannerStore();
  const history = usePlanCommandHistory();
  let reader: FileReader | undefined;

  const cancel = () => {
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
};
