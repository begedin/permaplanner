import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import {
  MAX_BACKGROUND_IMAGE_BYTES,
  useBackgroundImagePaste,
} from './useBackgroundImagePaste';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const image = 'data:image/png;base64,aW1hZ2U=';
let finishRead: () => void;
let scope: ReturnType<typeof effectScope>;
let paste: ReturnType<typeof useBackgroundImagePaste>;

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
    this: FileReader,
  ) {
    Object.defineProperty(this, 'result', { value: image });
    finishRead = () => this.dispatchEvent(new ProgressEvent('load'));
  });
  scope = effectScope();
  scope.run(() => {
    paste = useBackgroundImagePaste();
  });
});
afterEach(() => {
  scope.stop();
  vi.restoreAllMocks();
});

const pasteImage = (size = 5) => {
  const event = new Event('paste');
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [
        {
          type: 'image/png',
          getAsFile: () =>
            new File([new Uint8Array(size)], 'map.png', { type: 'image/png' }),
        },
      ],
    },
  });
  document.dispatchEvent(event);
};

it('commits pasted images through history and ignores reads from a disposed view', () => {
  pasteImage();
  finishRead();
  expect(usePermaplannerStore().backgroundImageDataUrl).toBe(image);
  usePlanCommandHistory().undo();
  expect(usePermaplannerStore().backgroundImageDataUrl).toBeUndefined();
  pasteImage();
  scope.stop();
  finishRead();
  expect(usePermaplannerStore().backgroundImageDataUrl).toBeUndefined();
});

it('discards a pending paste when the garden is replaced', async () => {
  pasteImage();
  await usePermaplannerStore().resetToNewPlan();
  finishRead();
  expect(usePermaplannerStore().backgroundImageDataUrl).toBeUndefined();
  expect(usePlanCommandHistory().canUndo).toBe(false);
});

it('rejects images above the limit before reading and accepts the exact limit', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = 'existing background';
  pasteImage(MAX_BACKGROUND_IMAGE_BYTES + 1);
  expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled();
  expect(paste.errorMessage.value).toContain('3 MB or less');
  expect(store.backgroundImageDataUrl).toBe('existing background');
  expect(usePlanCommandHistory().canUndo).toBe(false);

  pasteImage(MAX_BACKGROUND_IMAGE_BYTES);
  finishRead();
  expect(paste.errorMessage.value).toBeUndefined();
  expect(store.backgroundImageDataUrl).toBe(image);
  usePlanCommandHistory().undo();
  expect(store.backgroundImageDataUrl).toBe('existing background');
});

it('cancels an earlier read when a newer paste exceeds the limit and clears errors on garden change', async () => {
  pasteImage();
  const finishEarlierRead = finishRead;
  pasteImage(MAX_BACKGROUND_IMAGE_BYTES + 1);
  finishEarlierRead();
  expect(usePermaplannerStore().backgroundImageDataUrl).toBeUndefined();
  expect(paste.errorMessage.value).toContain('3 MB or less');

  await usePermaplannerStore().resetToNewPlan();
  expect(paste.errorMessage.value).toBeUndefined();
});
