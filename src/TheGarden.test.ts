import { mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import TheGarden from './TheGarden.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import GardenBed from './GardenBed.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

it('unsets new bed on cancel', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  store.newBed = { id: 'bed', path: [], name: 'Bed', plantIds: [] };
  await wrapper.vm.$nextTick();
  await wrapper.findAllComponents(GardenBed).at(-1)?.vm.$emit('cancel');
  expect(store.newBed).toBeUndefined();
});
