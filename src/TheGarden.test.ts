import type { Guild } from './gardenTypes';
import { rectangleShapePath } from './mapShapeGeometry';
import { useMapInteractionStore } from './useMapInteractionStore';
import { usePlanStateStore } from './usePlanStateStore';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import TheGarden from './TheGarden.vue';
import { createAuthedTestRouter } from './testing/authedTestSession';
import { routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';
import { useGuildHover } from './useGuildHover';
import GardenGuild from './GardenGuild.vue';
import { useMapScaleStore } from './useMapScaleStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { resetGuildSearch } from './useGuildSearch';

enableAutoUnmount(afterEach);

beforeAll(() => {
  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });
});

beforeEach(() => {
  localStorage.removeItem('permaplanner.showGuildLabels');
  localStorage.removeItem('permaplanner.showLandmarkLabels');
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
  resetGuildSearch();
  useGuildHover().clearHover();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  Element.prototype.scrollIntoView = vi.fn();
  useGardenSessionStore().gardenId = 'g1';
  useGardenSessionStore().gardenName = 'test';
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  vi.useRealTimers();
});

const placedGuild = (id: string, x: number): Guild => ({
  id,
  name: id.toUpperCase(),
  mulchLevel: 1,
  path: [
    [
      [
        { x, y: 0 },
        { x: x + 100, y: 0 },
        { x: x + 100, y: 100 },
        { x, y: 100 },
      ],
    ],
  ],
  plants: [],
});

const renderGarden = async (path = '/guilds') => {
  const router = await createAuthedTestRouter(path);
  return { router, view: render(TheGarden, { global: { plugins: [router] } }) };
};

it('explains the paste image size limit and allows dismissing the error', async () => {
  await renderGarden();
  const event = new Event('paste');
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [
        {
          type: 'image/png',
          getAsFile: () =>
            new File([new Uint8Array(3_000_001)], 'large.png', { type: 'image/png' }),
        },
      ],
    },
  });
  await fireEvent(document, event);
  await waitFor(() => {
    expect(
      screen.getByRole('alert', { name: 'Background image not added' }),
    ).toHaveTextContent('Paste an image of 3 MB or less.');
  });
  await fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss background image error' }),
  );
  expect(
    screen.queryByRole('alert', { name: 'Background image not added' }),
  ).not.toBeInTheDocument();
});

it('deselects when the guild page title is clicked', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];
  const { router } = await renderGarden('/guilds/guild');

  expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
    'Guild',
  );
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Deselect guild, Guilds' }),
  );
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
});

it('shows the guild header and guild list in the left sidebar', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', name: 'A guild', mulchLevel: 1, plants: [], path: [] },
    { id: 'guild-2', name: 'Another guild', mulchLevel: 1, plants: [], path: [] },
  ];
  await renderGarden();

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Guilds', level: 1 })).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'Guild list' })).toBeVisible();
    expect(screen.getByRole('article', { name: 'A guild' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Aerial map' })).toBeVisible();
  });
});

it('filters guilds in the sidebar by search query', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', name: 'A guild', mulchLevel: 1, plants: [], path: [] },
    { id: 'guild-2', name: 'Another guild', mulchLevel: 1, plants: [], path: [] },
  ];
  await renderGarden();

  await fireEvent.update(
    screen.getByRole('searchbox', { name: 'Search guilds' }),
    'Another',
  );

  await waitFor(() => {
    expect(screen.getByRole('article', { name: 'Another guild' })).toBeVisible();
    expect(screen.queryByRole('article', { name: 'A guild' })).not.toBeInTheDocument();
  });
});

it('deletes the selected guild on Delete only when confirmed', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [[[{ x: 0, y: 0 }]]], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  const { router } = await renderGarden('/guilds/guild');

  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(usePlanStateStore().state.guilds).toEqual([
    { id: 'guild', path: [[[{ x: 0, y: 0 }]]], name: 'Bed', plants: [], mulchLevel: 1 },
  ]);

  confirm.mockReturnValueOnce(true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(usePlanStateStore().state.guilds).toEqual([]);
  await flushPromises();
  await router.isReady();
  expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
});

it('switches selection to another guild and discards the previous edit', async () => {
  const bedA = placedGuild('a', 0);
  const bedB = placedGuild('b', 200);
  usePlanStateStore().state.guilds = [bedA, bedB];
  const { router } = await renderGarden('/guilds/a');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  await wrapper.vm.$nextTick();

  await fireEvent.click(screen.getByRole('button', { name: 'Path brush (B)' }));

  await wrapper
    .get('svg')
    .trigger('pointerdown', { button: 0, clientX: 50, clientY: 50 });
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, clientY: 50 }));
  await wrapper.vm.$nextTick();

  const guildB = wrapper
    .findAllComponents(GardenGuild)
    .find((c) => c.props('guild')?.id === 'b');
  await guildB?.find('path.pointer-events-fill').trigger('click');
  await flushPromises();
  await router.isReady();

  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe('b');
  expect(usePlanStateStore().state.guilds.find((g) => g.id === 'a')?.path).toEqual(
    bedA.path,
  );
});

it('scrolls to the selected guild when opening the guild view with a selection', async () => {
  const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
  usePlanStateStore().state.guilds = [
    { id: 'a', name: 'A', mulchLevel: 1, plants: [], path: [] },
    { id: 'b', name: 'B', mulchLevel: 1, plants: [], path: [] },
  ];
  await renderGarden('/guilds/b');
  await flushPromises();

  expect(scrollIntoView).toHaveBeenCalledWith({
    block: 'nearest',
    behavior: 'smooth',
  });
});

it('scrolls the sidebar to a guild selected on the aerial map', async () => {
  const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

  const bedA = placedGuild('a', 0);
  const bedB = placedGuild('b', 200);
  usePlanStateStore().state.guilds = [bedA, bedB];
  const { router } = await renderGarden('/guilds');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  await wrapper.vm.$nextTick();

  const guildB = wrapper
    .findAllComponents(GardenGuild)
    .find((c) => c.props('guild')?.id === 'b');
  await guildB?.find('path.pointer-events-fill').trigger('click');
  await flushPromises();
  await router.isReady();

  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe('b');
  expect(scrollIntoView).toHaveBeenCalledWith({
    block: 'nearest',
    behavior: 'smooth',
  });
});

it('deselects when placement is cancelled', async () => {
  const { hoveredId } = useGuildHover();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];
  const { router } = await renderGarden('/guilds/guild');
  hoveredId.value = 'guild';
  await fireEvent.click(screen.getByRole('button', { name: 'Path brush (B)' }));
  await fireEvent.keyDown(window, { key: 'Escape' });
  await flushPromises();
  await router.isReady();
  expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
  expect(hoveredId.value).toBeUndefined();
});

it('shows map tools in the top-right of the aerial map', async () => {
  await renderGarden();

  await waitFor(() => {
    expect(screen.getByRole('toolbar', { name: 'Map tools' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Select (V)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Path brush (B)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Move guild (M)' })).toBeVisible();
  });
});

it('disables edit and move tools when no guild is selected', async () => {
  await renderGarden();

  expect(screen.getByRole('button', { name: 'Path brush (B)' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move guild (M)' })).toBeDisabled();
});

it('activates tools with V, B, and M hotkeys', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];
  await renderGarden('/guilds/guild');

  const selectBtn = screen.getByRole('button', { name: 'Select (V)' });
  const editBtn = screen.getByRole('button', { name: 'Path brush (B)' });
  const moveBtn = screen.getByRole('button', { name: 'Move guild (M)' });

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
  await waitFor(() => {
    expect(editBtn).toHaveAttribute('aria-pressed', 'true');
  });

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
  await waitFor(() => {
    expect(moveBtn).toHaveAttribute('aria-pressed', 'true');
  });

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
  await waitFor(() => {
    expect(selectBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

it('does not edit a bed while the select tool is active', async () => {
  const bed = {
    id: 'guild',
    name: 'Bed',
    mulchLevel: 1 as const,
    path: [
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      ],
    ],
    plants: [],
  };
  usePlanStateStore().state.guilds = [bed];
  const { router } = await renderGarden('/guilds/guild');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  await wrapper.vm.$nextTick();

  await wrapper
    .get('svg')
    .trigger('pointerdown', { button: 0, clientX: 50, clientY: 50 });
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 50, clientY: 50 }));
  await wrapper.vm.$nextTick();

  expect(usePlanStateStore().state.guilds.find((g) => g.id === 'guild')?.path).toEqual(
    bed.path,
  );
});

it('uses an aerial guild click as the merge target, including cancellation', async () => {
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  usePlanStateStore().state.guilds = [
    { id: 'a', name: 'A', mulchLevel: 1, plants: [], path: [[path]] },
    {
      id: 'b',
      name: 'B',
      mulchLevel: 1,
      plants: [],
      path: [[path.map(({ x, y }) => ({ x: x + 200, y }))]],
    },
  ];
  const router = await createAuthedTestRouter('/guilds');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  await flushPromises();
  await wrapper.get('[data-guild-id="a"] button[aria-pressed]').trigger('click');
  const target = wrapper
    .findAllComponents(GardenGuild)
    .find((c) => c.props('guild').id === 'b');
  if (!target) throw new Error('Expected aerial target guild');
  vi.mocked(window.confirm).mockReturnValue(false);
  await target.get('path.pointer-events-fill').trigger('click');
  await flushPromises();
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining('Merge “A” with “B”?'),
  );
  expect(usePlanStateStore().state.guilds).toMatchObject([{ id: 'a' }, { id: 'b' }]);
  expect(useMapInteractionStore().mergeSourceId).toBe('a');
  expect(router.currentRoute.value.name).toBe(routeNames.guilds);

  vi.mocked(window.confirm).mockReturnValue(true);
  await target.get('path.pointer-events-fill').trigger('click');
  await flushPromises();
  expect(usePlanStateStore().state.guilds).toMatchObject([{ id: 'a', name: 'A + B' }]);
  expect(useMapInteractionStore().mergeSourceId).toBeUndefined();
  expect(router.currentRoute.value).toMatchObject({
    name: routeNames.guildsDetail,
    params: { guildId: 'a' },
  });
  wrapper.unmount();
});

it('shows the merge cursor and cancels with Escape while focus is outside a guild', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'a', name: 'A', mulchLevel: 1, plants: [], path: [] },
  ];
  const { view } = await renderGarden();
  await fireEvent.click(screen.getByRole('button', { name: 'Merge with' }));
  expect(view.container.querySelector('.guild-merge-mode')).toBeInTheDocument();
  await fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => {
    expect(view.container.querySelector('.guild-merge-mode')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel merge' }),
    ).not.toBeInTheDocument();
  });
  expect(usePlanStateStore().state.guilds).toMatchObject([{ id: 'a', name: 'A' }]);
  expect(window.confirm).not.toHaveBeenCalled();
});

it('shift-clicking a guild leaves its aerial outline intact', async () => {
  const store = useGardenStore();
  const guild = {
    id: 'bed',
    name: 'Bed',
    mulchLevel: 1 as const,
    plants: [],
    path: [
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      ],
    ],
  };
  usePlanStateStore().state.guilds = [guild];
  const router = await createAuthedTestRouter('/guilds');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });

  await wrapper
    .getComponent(GardenGuild)
    .find('path.pointer-events-fill')
    .trigger('click', { shiftKey: true });

  expect(usePlanStateStore().state.guilds).toEqual([guild]);
  expect(store.removeGuildFromAerialMap).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('keeps the guild when Delete is pressed while editing its name', async () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  await renderGarden('/guilds/guild');
  await fireEvent.keyDown(screen.getByDisplayValue('Bed'), { key: 'Delete' });
  expect(store.removeGuild).not.toHaveBeenCalled();
  expect(usePlanStateStore().state.guilds).toMatchObject([{ id: 'guild' }]);
});

it('edits background opacity from settings inside the aerial map and supports undo', async () => {
  await renderGarden('/guilds');
  const map = within(screen.getByRole('region', { name: 'Aerial map' }));
  const toggle = map.getByRole('button', { name: 'Map settings' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(map.queryByRole('slider')).not.toBeInTheDocument();
  await fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(map.getByRole('slider', { name: /^Map scale/ })).toBeVisible();
  const opacity = map.getByRole('slider', { name: /^BG opacity/ });
  const previousOpacity = usePlanStateStore().state.backgroundOpacity;
  await fireEvent.pointerDown(opacity);
  await fireEvent.update(opacity, '0.8');
  await fireEvent(opacity, new Event('change', { bubbles: true }));
  expect(usePlanStateStore().state.backgroundOpacity).toBe(0.8);
  await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(usePlanStateStore().state.backgroundOpacity).toBe(previousOpacity);
  await fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(map.queryByRole('slider')).not.toBeInTheDocument();
});

it('records calibration and onboarding together without delayed document changes', async () => {
  setActivePinia(createPinia());
  useGardenSessionStore().gardenId = 'g1';
  usePlanStateStore().state.backgroundImageDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=';
  await renderGarden();
  const scale = useMapScaleStore();
  const history = usePlanCommandHistory();
  const session = useGardenSessionStore();
  session.markSaved();
  await fireEvent.click(screen.getByRole('button', { name: 'Map settings' }));
  const slider = screen.getByRole('slider', { name: /^Map scale/ });
  vi.useFakeTimers();
  await fireEvent.update(slider, '20');
  expect(usePlanStateStore().state.onboardingState).toBe('done');
  expect(screen.getByText(/Map scale set/)).toBeInTheDocument();
  history.undo();
  await vi.advanceTimersByTimeAsync(1500);
  expect(scale.linePhysicalLength).toBe(1);
  expect(usePlanStateStore().state.onboardingState).toBe('initial');
  expect(session.hasUnsavedChanges).toBe(false);
  expect(screen.queryByText(/Map scale set/)).not.toBeInTheDocument();
  history.redo();
  expect(scale.linePhysicalLength).toBe(20);
  expect(usePlanStateStore().state.onboardingState).toBe('done');
  session.markSaved();
  await vi.advanceTimersByTimeAsync(1500);
  expect(session.hasUnsavedChanges).toBe(false);
  expect(screen.queryByText(/Map scale set/)).not.toBeInTheDocument();
});

it('keeps the landmark tool active when it deselects a guild and saves the chosen scale unit', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];
  const { router } = await renderGarden('/guilds/guild');
  await fireEvent.click(screen.getByRole('button', { name: 'landmark' }));
  await fireEvent.keyDown(document, { key: 'r' });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Bounding box (R)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Map settings' }));
  await fireEvent.change(screen.getByLabelText('Scale unit'), {
    target: { value: 'ft' },
  });
  expect(useGardenSessionStore().snapshot().mapScale).toMatchObject({
    unit: 'ft',
    linePhysicalLength: 1,
  });
  usePlanCommandHistory().undo();
  expect(useMapScaleStore().unit).toBe('m');
  await fireEvent.keyDown(document, { key: 'Escape' });
});

it('toggles guild and landmark names independently and remembers visibility without editing the plan', async () => {
  usePlanStateStore().state.guilds = [
    {
      id: 'orchard',
      name: 'Orchard',
      path: [
        [
          [
            { x: 10, y: 10 },
            { x: 100, y: 10 },
            { x: 100, y: 80 },
            { x: 10, y: 80 },
          ],
        ],
      ],
      plants: [],
      mulchLevel: 1,
    },
    { id: 'unplaced', name: 'Unplaced bed', path: [], plants: [], mulchLevel: 1 },
  ];
  usePlanStateStore().state.landmarks = [
    {
      id: 'shed',
      name: 'Shed',
      x: 200,
      y: 100,
      width: 80,
      height: 40,
      rotation: 0,
      path: rectangleShapePath(),
    },
  ];
  const before = useGardenSessionStore().snapshot();
  const { view } = await renderGarden();
  const map = within(screen.getByRole('region', { name: 'Aerial map' }));
  expect(map.getByText('Orchard')).toBeInTheDocument();
  expect(map.getByText('Shed')).toBeInTheDocument();
  expect(map.queryByText('Unplaced bed')).not.toBeInTheDocument();
  await fireEvent.click(map.getByRole('button', { name: 'Map settings' }));
  await fireEvent.click(map.getByRole('checkbox', { name: 'Guild names' }));
  expect(map.queryByText('Orchard')).not.toBeInTheDocument();
  expect(map.getByText('Shed')).toBeInTheDocument();
  await fireEvent.click(map.getByRole('checkbox', { name: 'Landmark names' }));
  expect(map.queryByText('Shed')).not.toBeInTheDocument();
  await fireEvent.click(map.getByRole('checkbox', { name: 'Guild names' }));
  expect(map.getByText('Orchard')).toBeInTheDocument();
  expect(useGardenSessionStore().snapshot()).toEqual(before);
  view.unmount();

  await renderGarden();
  const restored = within(screen.getByRole('region', { name: 'Aerial map' }));
  await fireEvent.click(restored.getByRole('button', { name: 'Map settings' }));
  expect(restored.getByRole('checkbox', { name: 'Guild names' })).toBeChecked();
  expect(restored.getByRole('checkbox', { name: 'Landmark names' })).not.toBeChecked();
  expect(restored.queryByText('Shed')).not.toBeInTheDocument();
});

it('reconciles selection on route re-entry so Delete only removes the current guild', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ];
  const house = {
    id: 'house',
    name: 'House',
    x: 100,
    y: 50,
    width: 80,
    height: 40,
    rotation: 0,
    path: rectangleShapePath(),
  };
  usePlanStateStore().state.landmarks = [house];
  const { router, view } = await renderGarden();
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Landmark: House' }), {
    key: 'Enter',
  });
  await waitFor(() =>
    expect(screen.getByRole('group', { name: 'Landmark details' })).toBeVisible(),
  );
  view.unmount();

  await router.push('/guilds/guild');
  render(TheGarden, { global: { plugins: [router] } });
  expect(
    screen.queryByRole('group', { name: 'Landmark details' }),
  ).not.toBeInTheDocument();
  await fireEvent.keyDown(document, { key: 'Delete' });
  expect(usePlanStateStore().state.guilds).toEqual([]);
  expect(usePlanStateStore().state.landmarks).toEqual([house]);
});

it('switches between guild and landmark selection and clears it when the garden changes', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ];
  usePlanStateStore().state.landmarks = [
    {
      id: 'house',
      name: 'House',
      x: 100,
      y: 50,
      width: 80,
      height: 40,
      rotation: 0,
      path: rectangleShapePath(),
    },
  ];
  const { router } = await renderGarden('/guilds/guild');
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Landmark: House' }), {
    key: 'Enter',
  });
  await waitFor(() => {
    expect(router.currentRoute.value.name).toBe(routeNames.guilds);
    expect(screen.getByRole('group', { name: 'Landmark details' })).toBeVisible();
  });
  await router.push('/guilds/guild');
  expect(
    screen.queryByRole('group', { name: 'Landmark details' }),
  ).not.toBeInTheDocument();
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Landmark: House' }), {
    key: 'Enter',
  });
  await flushPromises();
  useGardenSessionStore().gardenId = 'other-garden';
  await waitFor(() =>
    expect(
      screen.queryByRole('group', { name: 'Landmark details' }),
    ).not.toBeInTheDocument(),
  );
});

it('keeps the plot border optional and cancels drawing with Escape', async () => {
  await renderGarden();
  expect(usePlanStateStore().state.plotBorder).toEqual([]);
  expect(
    screen.queryByRole('button', { name: 'Edit plot border' }),
  ).not.toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'Plot border' }));
  expect(screen.getByLabelText('Draw feature')).toBeInTheDocument();
  await fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByLabelText('Draw feature')).not.toBeInTheDocument();
  expect(usePlanStateStore().state.plotBorder).toEqual([]);
});

it.each(['Delete', 'Remove plot border'])(
  'removes the selected border via %s without deleting another object',
  async (action) => {
    const guild = {
      id: 'guild',
      name: 'Guild',
      path: [],
      plants: [],
      mulchLevel: 1 as const,
    };
    usePlanStateStore().state.guilds = [guild];
    const border = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 100, y: 150 },
    ];
    usePlanStateStore().state.plotBorder = [[[...border, border[0]!]]];
    const { router } = await renderGarden('/guilds/guild');
    await fireEvent.click(screen.getByRole('button', { name: 'Edit plot border' }));
    await waitFor(() => expect(router.currentRoute.value.name).toBe(routeNames.guilds));
    if (action === 'Delete') await fireEvent.keyDown(document, { key: action });
    else await fireEvent.click(screen.getByRole('button', { name: action }));
    expect(usePlanStateStore().state.plotBorder).toEqual([]);
    expect(usePlanStateStore().state.guilds).toEqual([guild]);
    usePlanCommandHistory().undo();
    await flushPromises();
    await fireEvent.click(screen.getByRole('button', { name: 'Edit plot border' }));
    expect(
      screen.getByRole('button', { name: 'Remove plot border' }),
    ).toBeInTheDocument();
    await fireEvent.keyDown(document, { key: 'Escape' });
    await fireEvent.keyDown(document, { key: 'Delete' });
    expect(usePlanStateStore().state.plotBorder).toEqual([[[...border, border[0]!]]]);
    await fireEvent.keyDown(document, { key: 'p' });
    useGardenSessionStore().gardenId = 'other-garden';
    await flushPromises();
    await fireEvent.keyDown(document, { key: 'Delete' });
    expect(usePlanStateStore().state.plotBorder).toEqual([[[...border, border[0]!]]]);
    expect(
      screen.queryByRole('button', { name: 'Remove plot border' }),
    ).not.toBeInTheDocument();
  },
);

it('makes merge and drawing modes exclusive, including keyboard transitions', async () => {
  usePlanStateStore().state.guilds = [
    { id: 'bed', name: 'Bed', path: [], plants: [], mulchLevel: 1 },
  ];
  await renderGarden('/guilds/bed');
  const interaction = useMapInteractionStore();
  await fireEvent.click(screen.getByRole('button', { name: 'Merge with' }));
  expect(interaction).toMatchObject({ isMerging: true, activeTool: 'select' });
  await fireEvent.keyDown(document, { key: 'r' });
  expect(interaction).toMatchObject({
    isMerging: false,
    activeTool: 'draw',
    drawingBrush: 'rectangle',
    selectedGuildId: 'bed',
  });
  await flushPromises();
  await fireEvent.click(screen.getByRole('button', { name: 'Merge with' }));
  expect(interaction).toMatchObject({ isMerging: true, activeTool: 'select' });
  await fireEvent.keyDown(window, { key: 'Escape' });
  expect(interaction).toMatchObject({ isMerging: false, activeTool: 'select' });
});

it.each(
  (['guild', 'landmark', 'path', 'border'] as const).flatMap((feature) =>
    (['Path brush (B)', 'Polygon (P)', 'Bounding box (R)'] as const).map((brush) => ({
      feature,
      brush,
    })),
  ),
)('draws $feature with $brush and saves an undoable path', async ({ feature, brush }) => {
  usePlanStateStore().state.guilds = [
    { id: 'bed', name: 'Bed', path: [], plants: [], mulchLevel: 1 },
    { id: 'other', name: 'Other', path: [], plants: [], mulchLevel: 1 },
  ];
  const { view } = await renderGarden('/guilds/bed');
  const svg = view.container.querySelector<SVGSVGElement>('[data-main-svg]')!;
  svg.getScreenCTM = () =>
    ({
      a: 2,
      b: 0,
      inverse: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, e: -10, f: -20 }),
    }) as DOMMatrix;
  if (feature !== 'guild')
    await fireEvent.click(
      screen.getByRole('button', {
        name:
          feature === 'border' ? 'Plot border' : feature === 'path' ? 'Path' : 'landmark',
      }),
    );
  await fireEvent.click(screen.getByRole('button', { name: brush }));
  expect(view.container.querySelectorAll('[data-guild-brush]')).toHaveLength(1);
  const before = useGardenSessionStore().snapshot();
  const surface = screen.getByLabelText('Draw feature');
  await fireEvent(
    surface,
    new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 60, clientY: 80 }),
  );
  if (brush === 'Polygon (P)') {
    for (const [clientX, clientY] of [
      [160, 80],
      [160, 180],
    ]) {
      await fireEvent(
        surface,
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX, clientY }),
      );
    }
  } else {
    document.dispatchEvent(new MouseEvent('pointerup', { clientX: 160, clientY: 180 }));
  }
  expect(useGardenSessionStore().snapshot()).toEqual(before);
  await fireEvent.keyDown(document, { key: 'Enter' });
  const plan = usePlanStateStore().state;
  const path =
    feature === 'guild'
      ? plan.guilds[0]!.path
      : feature === 'landmark'
        ? plan.landmarks[0]!.path
        : feature === 'path'
          ? plan.paths[0]!.path
          : plan.plotBorder;
  expect(plan.guilds[1]).toEqual(before.guilds[1]);
  expect(path).toHaveLength(1);
  for (const ring of path.flat()) {
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring[0]).toEqual(ring.at(-1));
  }
  if (brush === 'Bounding box (R)' && feature === 'landmark') {
    expect(plan.landmarks).toMatchObject([{ x: 45, y: 45, width: 50, height: 50 }]);
  }
  usePlanCommandHistory().undo();
  expect(useGardenSessionStore().snapshot()).toEqual(before);
});

it.each(['save', 'cancel'])(
  'replaces the border with its subtraction preview and can %s afterwards',
  async (action) => {
    const old = [
      [
        [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 20, y: 20 },
          { x: 10, y: 20 },
          { x: 10, y: 10 },
        ],
      ],
    ];
    usePlanStateStore().state.plotBorder = old;
    const { view } = await renderGarden();
    const svg = view.container.querySelector<SVGSVGElement>('[data-main-svg]')!;
    svg.getScreenCTM = () =>
      ({
        a: 1,
        b: 0,
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      }) as DOMMatrix;
    await fireEvent.click(screen.getByRole('button', { name: 'Plot border' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Bounding box (R)' }));
    const surface = screen.getByLabelText('Draw feature');
    await fireEvent.keyDown(window, { key: 'Meta', code: 'MetaLeft', metaKey: true });
    await fireEvent(
      surface,
      new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 0,
        clientY: 0,
        metaKey: true,
      }),
    );
    await fireEvent(
      document,
      new MouseEvent('pointerup', { clientX: 30, clientY: 30, metaKey: true }),
    );
    await fireEvent.keyUp(window, { key: 'Meta', code: 'MetaLeft', metaKey: false });
    expect(
      screen.queryByRole('button', { name: 'Edit plot border' }),
    ).not.toBeInTheDocument();
    expect(usePlanStateStore().state.plotBorder).toEqual(old);
    if (action === 'cancel') {
      await fireEvent.keyDown(document, { key: 'Escape' });
      expect(
        screen.getByRole('button', { name: 'Edit plot border' }),
      ).toBeInTheDocument();
      expect(usePlanStateStore().state.plotBorder).toEqual(old);
      return;
    }
    await fireEvent.keyDown(document, { key: 'Enter' });
    expect(useMapInteractionStore().activeTool).toBe('draw');
    await fireEvent(
      surface,
      new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      }),
    );
    await fireEvent(document, new MouseEvent('pointerup', { clientX: 80, clientY: 80 }));
    await fireEvent.keyDown(document, { key: 'Enter' });
    expect(usePlanStateStore().state.plotBorder).toEqual([
      [
        [
          { x: 50, y: 50 },
          { x: 80, y: 50 },
          { x: 80, y: 80 },
          { x: 50, y: 80 },
          { x: 50, y: 50 },
        ],
      ],
    ]);
    expect(useMapInteractionStore().activeTool).toBe('select');
    usePlanCommandHistory().undo();
    expect(usePlanStateStore().state.plotBorder).toEqual(old);
  },
);

it('switches the shared editor between shapes with equal IDs and deletes only the selected feature', async () => {
  const shape = {
    id: 'shared',
    name: 'Shared',
    x: 100,
    y: 100,
    width: 60,
    height: 40,
    rotation: 0,
    path: rectangleShapePath(),
  };
  const plan = usePlanStateStore().state;
  plan.landmarks = [shape];
  plan.paths = [{ ...shape, x: 200 }];
  await renderGarden();
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Landmark: Shared' }), {
    key: 'Enter',
  });
  expect(screen.getByRole('group', { name: 'Landmark details' })).toBeVisible();
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Path: Shared' }), {
    key: 'Enter',
  });
  expect(
    screen.queryByRole('group', { name: 'Landmark details' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Path details' })).toBeVisible();
  await fireEvent.click(screen.getByRole('button', { name: 'Delete path' }));
  expect(plan).toMatchObject({ landmarks: [shape], paths: [] });
  expect(screen.queryByRole('group', { name: 'Path details' })).not.toBeInTheDocument();
  usePlanCommandHistory().undo();
  expect(plan.paths).toEqual([{ ...shape, x: 200 }]);
});
