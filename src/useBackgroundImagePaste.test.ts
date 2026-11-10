import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { usePlanStateStore } from './usePlanStateStore';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import {
  MAX_BACKGROUND_IMAGE_BYTES,
  useBackgroundImagePaste,
} from './useBackgroundImagePaste';
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
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBe(image);
  usePlanCommandHistory().undo();
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBeUndefined();
  pasteImage();
  scope.stop();
  finishRead();
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBeUndefined();
});

it.each(['reset', 'reload'] as const)(
  'discards a pending paste on %s, even with an unchanged garden id',
  (replacement) => {
    const session = useGardenSessionStore();
    session.hydrateFromDocument(session.snapshot(), { id: 'garden' });
    pasteImage();
    const finishStaleRead = finishRead;
    if (replacement === 'reset') session.reset();
    else session.hydrateFromDocument(session.snapshot(), { id: 'garden' });
    finishStaleRead();
    expect(usePlanStateStore().state.backgroundImageDataUrl).toBeUndefined();
    expect(usePlanCommandHistory().canUndo).toBe(false);

    pasteImage();
    finishRead();
    expect(usePlanStateStore().state.backgroundImageDataUrl).toBe(image);
    expect(usePlanCommandHistory().canUndo).toBe(true);
  },
);

it('rejects images above the limit before reading and accepts the exact limit', () => {
  usePlanStateStore().state.backgroundImageDataUrl = 'existing background';
  pasteImage(MAX_BACKGROUND_IMAGE_BYTES + 1);
  expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled();
  expect(paste.errorMessage.value).toContain('3 MB or less');
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBe('existing background');
  expect(usePlanCommandHistory().canUndo).toBe(false);

  pasteImage(MAX_BACKGROUND_IMAGE_BYTES);
  finishRead();
  expect(paste.errorMessage.value).toBeUndefined();
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBe(image);
  usePlanCommandHistory().undo();
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBe('existing background');
});

it('cancels an earlier read when a newer paste exceeds the limit and clears errors on garden change', async () => {
  pasteImage();
  const finishEarlierRead = finishRead;
  pasteImage(MAX_BACKGROUND_IMAGE_BYTES + 1);
  finishEarlierRead();
  expect(usePlanStateStore().state.backgroundImageDataUrl).toBeUndefined();
  expect(paste.errorMessage.value).toContain('3 MB or less');

  await useGardenSessionStore().reset();
  expect(paste.errorMessage.value).toBeUndefined();
});
