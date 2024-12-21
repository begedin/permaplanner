import { mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import TheGarden from './TheGarden.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import GardenGuild from './GardenGuild.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

it('unsets new guild on cancel', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  store.newGuild = { id: 'guild', path: [], name: 'Guild', plantIds: [] };
  await wrapper.vm.$nextTick();
  await wrapper.findAllComponents(GardenGuild).at(-1)?.vm.$emit('cancel');
  expect(store.newGuild).toBeUndefined();
});
