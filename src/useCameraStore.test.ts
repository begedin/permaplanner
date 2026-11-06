import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraStore } from './useCameraStore';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

describe('cameraToWorld', () => {
  it('should convert camera coordinates to world coordinates', () => {
    const camera = useCameraStore();
    camera.scale = 0.5;
    camera.zoom = 0.4;
    expect(camera.cameraToWorld(20)).toBe(100);
    expect(camera.cameraToWorld(0)).toBe(0);
  });
});

it.each([
  [0.25, 9],
  [1, 10],
  [1.44, 12],
  [4, 13],
  [10, 13],
])('sizes map labels at zoom %s with a capped screen size', (zoom, expectedPixels) => {
  const camera = useCameraStore();
  camera.zoom = zoom;
  for (const scale of [0.5, 1, 2]) {
    camera.scale = scale;
    expect(camera.mapLabelFontSize * scale * zoom).toBeCloseTo(expectedPixels);
  }
});
