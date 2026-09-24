import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';

import GuildTabHeader from './GuildTabHeader.vue';
import { createAppRouter } from './router';
import { createAuthedTestRouter } from './testing/authedTestSession';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import * as gardensApi from './api/gardens';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => {
  cleanup();
  vi.mocked(gardensApi.updateGarden).mockReset();
});

const renderHeader = async () => {
  const router = createAppRouter(createMemoryHistory());
  await router.push('/guilds');
  await router.isReady();
  return render(GuildTabHeader, {
    props: { title: 'Guilds', searchQuery: '' },
    global: { plugins: [router] },
  });
};

it('disables undo and redo when the command stacks are empty', async () => {
  await renderHeader();

  expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(
    true,
  );
  expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(
    true,
  );
});

it('enables undo after an edit and redo after undo', async () => {
  await renderHeader();
  const history = usePlanCommandHistory();
  const store = usePermaplannerStore();

  history.runMutation(() => {
    store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];
  });
  await flushPromises();
  expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(
    false,
  );
  expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(
    true,
  );

  await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  await flushPromises();

  expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(
    true,
  );
  expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(
    false,
  );
});

it('places Save after Add guild and enables it only for unsaved changes', async () => {
  const router = await createAuthedTestRouter();
  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  useGardenSessionStore().markSaved();
  vi.mocked(gardensApi.updateGarden).mockResolvedValue(1);
  render(GuildTabHeader, { props: { title: 'Guilds' }, global: { plugins: [router] } });

  expect(
    screen.getAllByRole('button').map((button) => button.textContent?.trim()),
  ).toEqual(['Undo', 'Redo', 'Add guild', 'Save']);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await fireEvent.click(screen.getByRole('button', { name: 'Add guild' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled(),
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled(),
  );
  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
});
