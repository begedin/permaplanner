import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';

import PlanSessionDrawer from './PlanSessionDrawer.vue';
import { usePermaplannerStore } from './usePermaplannerStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
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
  expect(screen.getByRole('button', { name: 'Open plan' })).toBeTruthy();
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
  const store = usePermaplannerStore();
  store.unsavedChanges = true;

  renderDrawer({ open: true });

  expect(screen.getByRole('status').textContent).toContain('Unsaved changes');
});
