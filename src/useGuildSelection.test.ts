import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import GuildTabHeader from './GuildTabHeader.vue';
import { createGuildTestRouter } from './testGuildRouter';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

const SelectionProbe = defineComponent({
  setup() {
    const { selectedGuildId } = useGuildSelection();
    return { selectedGuildId };
  },
  template:
    '<p :data-selected="selectedGuildId ?? \'none\'">{{ selectedGuildId ?? "none" }}</p>',
});

it('reads the guild route param on the guilds tab', async () => {
  const router = createGuildTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'alpha', name: 'Alpha', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: 'guilds-detail', params: { guildId: 'alpha' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });

  expect(screen.getByText('alpha').getAttribute('data-selected')).toBe('alpha');
});

it('reads the guild route param on the aerial tab', async () => {
  const router = createGuildTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: 'aerial-detail', params: { guildId: 'g1' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });

  expect(screen.getByText('g1').getAttribute('data-selected')).toBe('g1');
});

it('add guild navigates to the guilds tab with the new guild selected', async () => {
  const router = createGuildTestRouter();
  await router.push('/aerial');
  await router.isReady();

  render(GuildTabHeader, {
    props: { title: 'Aerial' },
    global: { plugins: [router] },
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Add guild' }));
  await flushPromises();
  await router.isReady();

  const store = useGardenStore();
  expect(store.guilds).toMatchObject([{ name: 'New guild' }]);
  expect(router.currentRoute.value.name).toBe('guilds-detail');
  expect(router.currentRoute.value.params.guildId).toBe(store.guilds[0]!.id);
});

it('points the guilds tab link at the selected guild from aerial', async () => {
  const router = createGuildTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: 'aerial-detail', params: { guildId: 'g1' } });
  await router.isReady();

  const CrossTabProbe = defineComponent({
    setup() {
      const { guildsTabTo, aerialTabTo } = useGuildSelection();
      return { guildsTabTo, aerialTabTo };
    },
    template:
      '<p>{{ guildsTabTo.name }}-{{ aerialTabTo.name }}-{{ aerialTabTo.params.guildId }}</p>',
  });

  render(CrossTabProbe, { global: { plugins: [router] } });
  expect(screen.getByText('guilds-detail-aerial-detail-g1')).toBeTruthy();
});

it('points the aerial tab link at the selected guild from guilds', async () => {
  const router = createGuildTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: 'guilds-detail', params: { guildId: 'g1' } });
  await router.isReady();

  const CrossTabProbe = defineComponent({
    setup() {
      const { guildsTabTo, aerialTabTo } = useGuildSelection();
      return { guildsTabTo, aerialTabTo };
    },
    template:
      '<p>{{ guildsTabTo.params.guildId }}-{{ aerialTabTo.name }}-{{ aerialTabTo.params.guildId }}</p>',
  });

  render(CrossTabProbe, { global: { plugins: [router] } });
  expect(screen.getByText('g1-aerial-detail-g1')).toBeTruthy();
});
