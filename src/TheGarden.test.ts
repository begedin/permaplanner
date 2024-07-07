import { mount } from '@vue/test-utils';
import { beforeEach, it, vi } from 'vitest';
import TheGarden from './TheGarden.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

it('mounts', () => {
  mount(TheGarden);
});
