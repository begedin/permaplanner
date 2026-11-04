import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, reactive } from 'vue';
import { useBackgroundImage } from './useBackgroundImage';
import { usePermaplannerStore } from './usePermaplannerStore';

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
  const plan = usePermaplannerStore();
  plan.backgroundImageDataUrl = 'first';
  const first = images[0]!;
  const staleLoad = first.onload!;
  plan.backgroundImageDataUrl = 'second';
  staleLoad.call(first, new Event('load'));
  expect(resource.ready).toBe(false);
  images[1]!.dispatchEvent(new Event('load'));
  expect(resource).toMatchObject({ ready: true, imgWidth: 640, imgHeight: 480 });
  plan.backgroundImageDataUrl = undefined;
  expect(resource).toMatchObject({ ready: false, imgWidth: 0, imgHeight: 0 });
  plan.backgroundImageDataUrl = 'broken';
  images[2]!.dispatchEvent(new Event('error'));
  expect(resource.ready).toBe(false);
  const disposedLoad = images[2]!.onload!;
  scope.stop();
  disposedLoad.call(images[2]!, new Event('load'));
  expect(resource.ready).toBe(false);
  expect(document.body.querySelector('img')).toBeNull();
});
