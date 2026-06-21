import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';

import * as gardenSharesApi from './api/gardenShares';

import PlanSessionPanel from './PlanSessionPanel.vue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { seedAuthedTestSession } from './testing/authedTestSession';
import { routeNames } from './router';

vi.mock('./api/gardenShares');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/import', name: routeNames.import, component: { template: '<div />' } },
    { path: '/privacy', name: routeNames.privacy, component: { template: '<div />' } },
  ],
});

const existingShare = {
  id: 'share-1',
  url: '/share/share-1',
  createdAt: '2026-06-15T10:00:00.000Z',
};

const existingShareHref = `${window.location.origin}${existingShare.url}`;

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  seedAuthedTestSession();
  vi.mocked(gardenSharesApi.listGardenShares).mockResolvedValue([existingShare]);
  vi.mocked(gardenSharesApi.createGardenShare).mockResolvedValue({
    id: 'share-2',
    url: '/share/share-2',
    createdAt: '2026-06-15T11:00:00.000Z',
  });
  vi.mocked(gardenSharesApi.revokeGardenShare).mockResolvedValue();
  await router.push('/');
  await router.isReady();
});

afterEach(() => cleanup());

const renderPanel = () => {
  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'Backyard';
  return render(PlanSessionPanel, { global: { plugins: [router] } });
};

it('lists existing share links for the active garden', async () => {
  renderPanel();

  await waitFor(() => {
    expect(gardenSharesApi.listGardenShares).toHaveBeenCalledWith('g1');
  });

  expect(screen.getByRole('list', { name: 'Share links' })).toBeTruthy();
  expect(screen.getByRole('link', { name: existingShareHref })).toBeTruthy();
});

it('revokes a listed share link', async () => {
  renderPanel();

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: `Revoke share link ${existingShareHref}` }),
    ).toBeTruthy();
  });

  await fireEvent.click(
    screen.getByRole('button', { name: `Revoke share link ${existingShareHref}` }),
  );

  await waitFor(() => {
    expect(gardenSharesApi.revokeGardenShare).toHaveBeenCalledWith('g1', 'share-1');
  });

  expect(screen.queryByRole('link', { name: existingShareHref })).toBeNull();
});
