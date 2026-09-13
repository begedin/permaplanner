import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { useGuildHover } from './useGuildHover';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  useGuildHover().clearHover();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('createGuild adds a guild', async () => {
  const store = useGardenStore();
  expect(store.guilds).toEqual([]);

  const created = store.createGuild();
  await nextTick();

  expect(store.guilds).toMatchObject([
    { name: 'New guild', path: [], plants: [], mulchLevel: 1 },
  ]);
  expect(created.id).toEqual(store.guilds[0]!.id);
});

it('removeGuild removes guild', () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
    { id: 'guild2', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuild('guild');

  expect(store.guilds).toEqual([
    { id: 'guild2', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
});

it('removeGuild does nothing if guild not found', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];

  store.removeGuild('guild2');

  expect(store.guilds).toEqual([
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
});

it('removeGuild does nothing when deletion is not confirmed', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const store = useGardenStore();
  const { hoveredId } = useGuildHover();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  hoveredId.value = 'guild';

  store.removeGuild('guild');

  expect(store.guilds).toEqual([
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
  expect(hoveredId.value).toBe('guild');
});

it('removeGuild clears hover for the deleted guild', () => {
  const store = useGardenStore();
  const { hoveredId } = useGuildHover();
  store.guilds = [{ id: 'guild', path: [], name: 'Bed', plants: [], mulchLevel: 1 }];
  hoveredId.value = 'guild';

  store.removeGuild('guild');

  expect(store.guilds).toEqual([]);
  expect(hoveredId.value).toBeUndefined();
});

it('removeGuildFromAerialMap clears path only', () => {
  const store = useGardenStore();
  store.guilds = [
    {
      id: 'g1',
      path: [{ x: 1, y: 2 }],
      name: 'Bed',
      plants: [
        { id: 't', plantId: 'p', x: 0, y: 0, width: 1, height: 1, nameOrCultivar: 'x' },
      ],
      mulchLevel: 1,
    },
  ];

  store.removeGuildFromAerialMap('g1');

  expect(store.guilds[0]).toMatchObject({
    id: 'g1',
    path: [],
    name: 'Bed',
    plants: [{ id: 't', plantId: 'p' }],
  });
});

it('removeGuildFromAerialMap does nothing if guild not found', () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', path: [{ x: 0, y: 0 }], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuildFromAerialMap('other');

  expect(store.guilds[0]!.path).toEqual([{ x: 0, y: 0 }]);
});

it('setGuildPath replaces the guild path', () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'g1', path: [{ x: 0, y: 0 }], name: 'Bed', plants: [], mulchLevel: 1 },
  ];

  store.setGuildPath('g1', [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);

  expect(store.guilds[0]!.path).toEqual([
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
});

it('updateGuildName and updateGuildNote mutate guild fields', () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'g1', path: [], name: 'Old', plants: [], mulchLevel: 1, note: 'keep' },
  ];

  store.updateGuildName('g1', 'New');
  store.updateGuildNote('g1', 'Bed notes');
  expect(store.guilds[0]).toMatchObject({ name: 'New', note: 'Bed notes' });

  store.updateGuildNote('g1', '');
  expect(store.guilds[0]).not.toHaveProperty('note');
});

it('setGuildMulchLevel updates mulch', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', path: [], name: 'Bed', plants: [], mulchLevel: 1 }];
  store.setGuildMulchLevel('g1', 4);
  expect(store.guilds[0]).toMatchObject({ mulchLevel: 4 });
});

it('removeGuildThings removes by id set', () => {
  const store = useGardenStore();
  const a = {
    id: 'a',
    plantId: 'p',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    nameOrCultivar: 'x',
  };
  const b = {
    id: 'b',
    plantId: 'p',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    nameOrCultivar: 'x',
  };
  store.guilds = [{ id: 'g1', path: [], name: 'Bed', plants: [a, b], mulchLevel: 1 }];
  store.removeGuildThings('g1', ['b']);
  expect(store.guilds[0]!.plants).toEqual([a]);
});

it('addCatalogPlantToGuild creates UserPlant and places a thing', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', path: [], name: 'Bed', plants: [], mulchLevel: 1 }];
  store.plants = [];

  store.addCatalogPlantToGuild('g1', 'comfrey', null);

  expect(store.plants).toMatchObject([{ speciesId: 'comfrey', cultivarId: null }]);
  expect(store.guilds[0]!.plants).toHaveLength(1);
  expect(store.guilds[0]!.plants[0]).toMatchObject({
    plantId: store.plants[0]!.id,
    width: 16,
    height: 16,
  });
});

it('replaceGuildThingsWithCatalogPlant retargets things and preserves geometry', () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  const thing = {
    id: 't1',
    plantId: 'plant',
    x: 12,
    y: 34,
    width: 20,
    height: 18,
    nameOrCultivar: 'Comfrey',
  };
  store.guilds = [{ id: 'g1', path: [], name: 'Bed', plants: [thing], mulchLevel: 1 }];

  store.replaceGuildThingsWithCatalogPlant('g1', ['t1'], 'basil', 'genovese');

  const basil = store.plants.find(
    (p) => p.speciesId === 'basil' && p.cultivarId === 'genovese',
  );
  expect(store.guilds[0]!.plants).toEqual([
    {
      ...thing,
      plantId: basil!.id,
      nameOrCultivar: 'Genovese',
    },
  ]);
});

it('setGuildThingGrowthPhase and setGuildThingVigor set and clear fields', () => {
  const store = useGardenStore();
  store.guilds = [
    {
      id: 'g1',
      path: [],
      name: 'Bed',
      mulchLevel: 1,
      plants: [
        { id: 't1', plantId: 'p', x: 0, y: 0, width: 1, height: 1, nameOrCultivar: 'x' },
      ],
    },
  ];

  store.setGuildThingGrowthPhase('g1', 't1', 'young');
  store.setGuildThingVigor('g1', 't1', 4);
  expect(store.guilds[0]!.plants[0]).toMatchObject({ growthPhase: 'young', vigor: 4 });

  store.setGuildThingGrowthPhase('g1', 't1', '');
  store.setGuildThingVigor('g1', 't1', undefined);
  expect(store.guilds[0]!.plants[0]?.growthPhase).toBeUndefined();
  expect(store.guilds[0]!.plants[0]?.vigor).toBeUndefined();
});

it('merges guild contents and notes as one undoable change', () => {
  const store = useGardenStore();
  const plant = {
    id: 'p1',
    plantId: 'comfrey',
    x: 2,
    y: 3,
    width: 4,
    height: 5,
    nameOrCultivar: 'Comfrey',
  };
  const otherPlant = { ...plant, id: 'p2', x: 20, growthPhase: 'established' as const };
  const original = [
    {
      id: 'a',
      name: 'A',
      note: 'First',
      path: [],
      plants: [plant],
      mulchLevel: 1 as const,
    },
    {
      id: 'b',
      name: 'B',
      note: 'Second',
      path: [],
      plants: [otherPlant],
      mulchLevel: 2 as const,
    },
  ];
  const merged = [
    {
      ...original[0],
      name: 'A + B',
      note: 'First + Second',
      plants: [plant, otherPlant],
    },
  ];
  store.guilds = structuredClone(original);
  expect(store.mergeGuilds('a', 'b')).toBe(true);
  expect(store.guilds).toEqual(merged);
  usePlanCommandHistory().undo();
  expect(store.guilds).toEqual(original);
  usePlanCommandHistory().redo();
  expect(store.guilds).toEqual(merged);
});

it('ignores missing guilds and self merges', () => {
  const store = useGardenStore();
  const guild = { id: 'a', name: 'A', path: [], plants: [], mulchLevel: 1 as const };
  store.guilds = [guild];
  expect([
    store.mergeGuilds('a', 'a'),
    store.mergeGuilds('a', 'missing'),
    store.mergeGuilds('missing', 'a'),
  ]).toEqual([false, false, false]);
  expect(store.guilds).toEqual([guild]);
});

it.each([
  [undefined, 'Second', 'Second'],
  ['First', undefined, 'First'],
  [undefined, undefined, undefined],
])('joins optional notes without empty separators', (first, second, expected) => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'a', name: 'A', note: first, path: [], plants: [], mulchLevel: 1 },
    { id: 'b', name: 'B', note: second, path: [], plants: [], mulchLevel: 1 },
  ];
  store.mergeGuilds('a', 'b');
  expect(store.guilds).toMatchObject([{ name: 'A + B', note: expected }]);
});
