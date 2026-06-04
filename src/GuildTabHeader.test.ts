import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';

import GuildTabHeader from './GuildTabHeader.vue';
import { createAppRouter } from './router';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

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
