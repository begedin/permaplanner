import { cleanup, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';

import PrivacyPolicy from './PrivacyPolicy.vue';
import { createAppRouter, routeNames } from './router';

const router = createAppRouter(createMemoryHistory());

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  await router.push({ name: routeNames.privacy });
  await router.isReady();
});

afterEach(() => cleanup());

it('renders the privacy statement and back link', () => {
  render(PrivacyPolicy, {
    global: {
      plugins: [router],
    },
  });

  expect(screen.getByRole('heading', { name: 'Privacy', level: 1 })).toBeTruthy();
  expect(
    screen.getByText(/does not store your garden plans on our servers/i),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Back to Permaplanner' }).getAttribute('href'),
  ).toBe('/guilds');
});
