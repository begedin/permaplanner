import { cleanup } from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import TheGarden from './TheGarden.vue';
import { useGardenStore } from './useGardenStore';
import GardenGuild from './GardenGuild.vue';
import { usePermaplannerStore } from './usePermaplannerStore';

beforeAll(() => {
  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
  const store = usePermaplannerStore();
  store.fileName = 'test';
});

afterEach(() => {
  cleanup();
});

it('deselects when placement is cancelled', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  store.selectedId = 'guild';
  store.hoveredId = 'guild';
  await wrapper.vm.$nextTick();
  const guildComponents = wrapper.findAllComponents(GardenGuild);
  const placement = guildComponents.find((c) => c.props('guild')?.id === 'guild');
  await placement?.vm.$emit('cancel');
  expect(store.selectedId).toBeUndefined();
  expect(store.hoveredId).toBeUndefined();
});
