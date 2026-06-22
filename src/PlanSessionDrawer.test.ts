import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';

import * as gardensApi from './api/gardens';

import PlanSessionDrawer from './PlanSessionDrawer.vue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
import { seedAuthedTestSession } from './testing/authedTestSession';

import { routeNames } from './router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/privacy', name: routeNames.privacy, component: { template: '<div />' } },
    { path: '/import', name: routeNames.import, component: { template: '<div />' } },
  ],
});

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  seedAuthedTestSession();
  await router.push('/');
  await router.isReady();
});

afterEach(() => cleanup());

const renderDrawer = (props: { open: boolean }) =>
  render(PlanSessionDrawer, {
    props,
    global: { plugins: [router] },
  });

it('shows plan actions when open', () => {
  renderDrawer({ open: true });

  expect(screen.getByRole('dialog', { name: 'Plan and sync' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Import another garden' })).toBeTruthy();
});

it('closes from the header close button', async () => {
  const { emitted } = renderDrawer({ open: true });

  await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  expect(emitted()['update:open']).toEqual([[false]]);
});

it('closes when the backdrop is clicked', async () => {
  const { emitted } = renderDrawer({ open: true });

  await fireEvent.click(screen.getByLabelText('Close plan menu'));

  expect(emitted()['update:open']).toEqual([[false]]);
});

it('shows unsaved indicator inside the drawer when there are changes', () => {
  vi.mocked(gardensApi.updateGarden).mockImplementation(() => new Promise(() => {}));

  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'plan.json';
  const coordinator = usePlanSaveCoordinator();
  coordinator.markSaved();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });

  renderDrawer({ open: true });

  expect(screen.getByText('Unsaved changes')).toBeTruthy();
});
