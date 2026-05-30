import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import App from './App.vue';
import { createGuildTestRouter } from './testGuildRouter';
import { usePermaplannerStore } from './usePermaplannerStore';

vi.mock('./usePlanAppGate', () => ({
  showMainApp: { value: true },
}));

vi.mock('./usePlanSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./usePlanSession')>();
  return {
    ...actual,
    usePlanSession: () => ({
      load: vi.fn(),
      newPlan: vi.fn(),
      save: vi.fn(),
      saveAs: vi.fn(),
    }),
  };
});

const router = createGuildTestRouter();

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  await router.push({ name: 'guilds' });
  await router.isReady();
});

afterEach(() => cleanup());

const renderApp = () =>
  render(App, {
    global: {
      plugins: [router],
    },
  });

it('opens the plan drawer from the top bar icon', async () => {
  renderApp();

  expect(screen.queryByRole('dialog', { name: 'Plan and sync' })).toBeNull();

  await fireEvent.click(screen.getByRole('button', { name: 'Plan and sync' }));

  expect(screen.getByRole('dialog', { name: 'Plan and sync' })).toBeTruthy();
});

it('shows an unsaved dot on the plan menu button', () => {
  usePermaplannerStore().unsavedChanges = true;
  renderApp();

  expect(
    screen.getByRole('button', { name: 'Plan and sync, unsaved changes' }),
  ).toBeTruthy();
});
