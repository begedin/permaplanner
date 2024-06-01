import { beforeEach, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import App from './App.vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));

  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });

  Object.defineProperty(global, 'indexedDB', {
    get: () => ({ open: vi.fn().mockReturnValue({ transaction: vi.fn() }) }),
  });
});

it('renders', () => {
  mount(App);
});
