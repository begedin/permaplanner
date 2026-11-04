import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useBackgroundImagePaste } from './useBackgroundImagePaste';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const image = 'data:image/png;base64,aW1hZ2U=';
let finishRead: () => void;
let scope: ReturnType<typeof effectScope>;

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
    this: FileReader,
  ) {
    Object.defineProperty(this, 'result', { value: image });
    finishRead = () => this.dispatchEvent(new ProgressEvent('load'));
  });
  scope = effectScope();
  scope.run(useBackgroundImagePaste);
});
afterEach(() => {
  scope.stop();
  vi.restoreAllMocks();
});

const pasteImage = () => {
  const event = new Event('paste');
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [
        {
          type: 'image/png',
          getAsFile: () => new File(['image'], 'map.png', { type: 'image/png' }),
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
