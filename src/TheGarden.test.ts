import { render, screen, cleanup, fireEvent } from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import TheGarden from './TheGarden.vue';
import { useGardenStore } from './useGardenStore';
import GardenGuild from './GardenGuild.vue';

beforeAll(() => {
  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });

  Object.defineProperty(global, 'indexedDB', {
    get: () => ({ open: vi.fn().mockReturnValue({ transaction: vi.fn() }) }),
  });
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(() => {
  cleanup();
});

it('changes color of garden bed button when drawing new guild', async () => {
  render(TheGarden);

  const button = screen.getByRole('button', { name: 'Guild' });
  const classesBefore = button.classList.value;

  useGardenStore().startDrawGuild();
  await flushPromises();

  const classesAfter = button.classList.value;

  expect(classesBefore).not.toEqual(classesAfter);
});

it('starts drawing new guild', async () => {
  render(TheGarden);

  const store = useGardenStore();
  expect(store.newGuild).toBeFalsy();

  const button = screen.getByRole('button', { name: 'Guild' });
  fireEvent.click(button);

  await flushPromises();

  expect(useGardenStore().newGuild).toBeTruthy();
});

it('unsets new guild on cancel', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  store.newGuild = { id: 'guild', path: [], name: 'Guild', plants: [] };
  await wrapper.vm.$nextTick();
  await wrapper.findAllComponents(GardenGuild).at(-1)?.vm.$emit('cancel');
  expect(store.newGuild).toBeUndefined();
});
