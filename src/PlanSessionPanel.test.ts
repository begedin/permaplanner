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
const existingShareJsonHref = `${existingShareHref}.json`;

const writeText = vi.fn<typeof navigator.clipboard.writeText>();

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  seedAuthedTestSession();
  writeText.mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
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
    expect(screen.getByRole('link', { name: existingShareHref })).toBeVisible();
  });
  expect(gardenSharesApi.listGardenShares).toHaveBeenCalledWith('g1');
});

it('revokes a listed share link', async () => {
  renderPanel();

  await fireEvent.click(
    await screen.findByRole('button', { name: `Revoke share link ${existingShareHref}` }),
  );

  await waitFor(() => {
    expect(gardenSharesApi.revokeGardenShare).toHaveBeenCalledWith('g1', 'share-1');
  });

  await waitFor(() => {
    expect(
      screen.queryByRole('link', { name: existingShareHref }),
    ).not.toBeInTheDocument();
  });
});

it('copies the current guild share JSON payload to the clipboard', async () => {
  const store = usePermaplannerStore();
  store.guilds = [
    {
      id: 'g1',
      name: 'Edge guild',
      path: [],
      mulchLevel: 3,
      note: 'North bed',
      plants: [
        {
          id: 'p1',
          plantId: 'basil',
          nameOrCultivar: 'Thai Basil',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          growthPhase: 'young',
          vigor: 4,
        },
      ],
    },
  ];

  renderPanel();

  await fireEvent.click(screen.getByRole('button', { name: 'Copy guild JSON' }));

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  const copied = JSON.parse(String(writeText.mock.calls[0]?.[0])) as {
    gardenName: string;
    guilds: unknown[];
    summary: string;
  };

  expect(copied).toMatchObject({
    gardenName: 'Backyard',
    guilds: store.guilds,
    summary: expect.stringContaining('Edge guild'),
  });
  expect(copied.summary).toContain('Thai Basil');
});

it('copies HTML and JSON share links to the clipboard', async () => {
  renderPanel();

  await fireEvent.click(
    await screen.findByRole('button', {
      name: `Copy HTML share link ${existingShareHref}`,
    }),
  );

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(existingShareHref);
  });

  await fireEvent.click(
    await screen.findByRole('button', {
      name: `Copy JSON share link ${existingShareJsonHref}`,
    }),
  );

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(existingShareJsonHref);
  });
});
