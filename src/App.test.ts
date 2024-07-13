import { render, screen, cleanup, fireEvent } from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import App from './App.vue';
import { useGardenStore } from './useGardenStore';

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

it('renders', () => {
  render(App);
});

it('changes color of garden bed button when drawing new bed', async () => {
  render(App);

  const button = screen.getByRole('button', { name: 'Bed' });
  const classesBefore = button.classList.value;

  useGardenStore().startDrawBed();
  await flushPromises();

  const classesAfter = button.classList.value;

  expect(classesBefore).not.toEqual(classesAfter);
});

it('starts drawing new bed', async () => {
  render(App);

  const store = useGardenStore();
  expect(store.newBed).toBeFalsy();

  const button = screen.getByRole('button', { name: 'Bed' });
  fireEvent.click(button);

  await flushPromises();

  expect(useGardenStore().newBed).toBeTruthy();
});
