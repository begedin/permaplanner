import { usePlanStateStore } from './usePlanStateStore';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, reactive } from 'vue';
import { useBackgroundImage } from './useBackgroundImage';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

it('clears measurements and ignores obsolete loads after replacement, removal, or disposal', () => {
  const images: HTMLImageElement[] = [];
  vi.stubGlobal('Image', function () {
    const image = document.createElement('img');
    Object.defineProperties(image, {
      naturalWidth: { value: 640 },
      naturalHeight: { value: 480 },
    });
    images.push(image);
    return image;
  });
  const scope = effectScope();
  const resource = reactive(scope.run(useBackgroundImage)!);
  expect(resource.mapSize).toEqual({ width: 1000, height: 1000 });
  usePlanStateStore().state.backgroundImageDataUrl = 'first';
  const first = images[0]!;
  const staleLoad = first.onload!;
  usePlanStateStore().state.backgroundImageDataUrl = 'second';
  staleLoad.call(first, new Event('load'));
  expect(resource.mapSize).toBeUndefined();
  images[1]!.dispatchEvent(new Event('load'));
  expect(resource.mapSize).toEqual({ width: 640, height: 480 });
  usePlanStateStore().state.backgroundImageDataUrl = undefined;
  expect(resource.mapSize).toEqual({ width: 1000, height: 1000 });
  usePlanStateStore().state.backgroundImageDataUrl = 'broken';
  images[2]!.dispatchEvent(new Event('error'));
  expect(resource.mapSize).toBeUndefined();
  const disposedLoad = images[2]!.onload!;
  scope.stop();
  disposedLoad.call(images[2]!, new Event('load'));
  expect(resource.mapSize).toBeUndefined();
  expect(document.body.querySelector('img')).toBeNull();
});
