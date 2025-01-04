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
