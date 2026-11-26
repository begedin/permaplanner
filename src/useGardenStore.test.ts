import { hasPlantPlacement } from './gardenTypes';
import { usePlanStateStore } from './usePlanStateStore';
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
  expect(usePlanStateStore().state.guilds).toEqual([]);

  const created = store.createGuild();
  await nextTick();

  expect(usePlanStateStore().state.guilds).toMatchObject([
    { name: 'New guild', path: [], plants: [], mulchLevel: 1 },
  ]);
  expect(created.id).toEqual(usePlanStateStore().state.guilds[0]!.id);
});

it('removeGuild removes guild', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
    { id: 'guild2', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuild('guild');

  expect(usePlanStateStore().state.guilds).toEqual([
    { id: 'guild2', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
});

it('removeGuild does nothing if guild not found', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuild('guild2');

  expect(usePlanStateStore().state.guilds).toEqual([
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
});

it('removeGuild does nothing when deletion is not confirmed', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const store = useGardenStore();
  const { hoveredId } = useGuildHover();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];
  hoveredId.value = 'guild';

  store.removeGuild('guild');

  expect(usePlanStateStore().state.guilds).toEqual([
    { id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 },
  ]);
  expect(hoveredId.value).toBe('guild');
});

it('removeGuild clears hover for the deleted guild', () => {
  const store = useGardenStore();
  const { hoveredId } = useGuildHover();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  hoveredId.value = 'guild';

  store.removeGuild('guild');

  expect(usePlanStateStore().state.guilds).toEqual([]);
  expect(hoveredId.value).toBeUndefined();
});

it('removeGuildFromAerialMap clears path only', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    {
      id: 'g1',
      path: [[[{ x: 1, y: 2 }]]],
      name: 'Bed',
      plants: [
        { id: 't', plantId: 'p', x: 0, y: 0, width: 1, height: 1, nameOrCultivar: 'x' },
      ],
      mulchLevel: 1,
    },
  ];

  store.removeGuildFromAerialMap('g1');

  expect(usePlanStateStore().state.guilds[0]).toMatchObject({
    id: 'g1',
    path: [],
    name: 'Bed',
    plants: [{ id: 't', plantId: 'p' }],
  });
});

it('removeGuildFromAerialMap does nothing if guild not found', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'guild', path: [[[{ x: 0, y: 0 }]]], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuildFromAerialMap('other');

  expect(usePlanStateStore().state.guilds[0]!.path).toEqual([[[{ x: 0, y: 0 }]]]);
});

it('setGuildPath replaces the guild path', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'g1', path: [[[{ x: 0, y: 0 }]]], name: 'Bed', plants: [], mulchLevel: 1 },
  ];

  store.setGuildPath('g1', [
    [
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    ],
  ]);

  expect(usePlanStateStore().state.guilds[0]!.path).toEqual([
    [
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    ],
  ]);
});

it('renames the guild', () => {
  const { store, guild } = createGuildWithPlant();
  store.updateGuildName(guild.id, 'Bed');
  expect(store.guilds[0]?.name).toBe('Bed');
});

it('setGuildMulchLevel updates mulch', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'g1', path: [], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  store.setGuildMulchLevel('g1', 4);
  expect(usePlanStateStore().state.guilds[0]).toMatchObject({ mulchLevel: 4 });
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
  usePlanStateStore().state.guilds = [
    { id: 'g1', path: [], name: 'Bed', plants: [a, b], mulchLevel: 1 },
  ];
  store.removeGuildThings('g1', ['b']);
  expect(usePlanStateStore().state.guilds[0]!.plants).toEqual([a]);
});

it('addCatalogPlantToGuild creates an unplaced individual', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
    { id: 'g1', path: [], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  usePlanStateStore().state.plants = [];

  store.addCatalogPlantToGuild('g1', 'comfrey', null);

  expect(usePlanStateStore().state.plants).toMatchObject([
    { speciesId: 'comfrey', cultivarId: null },
  ]);
  expect(usePlanStateStore().state.guilds[0]!.plants).toHaveLength(1);
  expect(usePlanStateStore().state.guilds[0]!.plants[0]).toMatchObject({
    plantId: usePlanStateStore().state.plants[0]!.id,
    width: 0,
    height: 0,
  });
});

it('replaceGuildThingsWithCatalogPlant retargets things and preserves geometry', () => {
  const store = useGardenStore();
  usePlanStateStore().state.plants = [
    { id: 'plant', speciesId: 'comfrey', cultivarId: null },
  ];
  const thing = {
    id: 't1',
    plantId: 'plant',
    x: 12,
    y: 34,
    width: 20,
    height: 20,
    nameOrCultivar: 'Comfrey',
  };
  usePlanStateStore().state.guilds = [
    {
      id: 'g1',
      path: [],
      name: 'Bed',
      plants: [{ ...thing, matureSpreadM: 0.6 }],
      mulchLevel: 1,
    },
  ];

  store.replaceGuildThingsWithCatalogPlant('g1', ['t1'], 'basil', 'genovese');

  const basil = usePlanStateStore().state.plants.find(
    (p) => p.speciesId === 'basil' && p.cultivarId === 'genovese',
  );
  expect(usePlanStateStore().state.guilds[0]!.plants).toEqual([
    {
      ...thing,
      plantId: basil!.id,
      nameOrCultivar: 'Genovese',
    },
  ]);
});

it('clears nursery widths for each instance of a changed cultivar in one undo step', () => {
  const garden = useGardenStore();
  const guilds = [garden.createGuild(), garden.createGuild()];
  for (const guild of guilds) {
    garden.addCatalogPlantToGuild(guild.id, 'apple', 'granny_smith');
    garden.setMatureSpread(guild.id, guild.plants[0]!.id, 2.7);
  }
  const renamed = {
    id: garden.plants[0]!.id,
    speciesId: 'apple',
    cultivarId: 'granny_smith',
    speciesOverride: { name: 'Orchard apple' },
  };
  const widths = () => garden.guilds.map((guild) => guild.plants[0]?.matureSpreadM);
  garden.savePlant(renamed);
  expect(widths()).toEqual([2.7, 2.7]);
  garden.savePlant({ ...renamed, cultivarId: null });
  expect(widths()).toEqual([undefined, undefined]);
  usePlanCommandHistory().undo();
  expect(garden.plants).toMatchObject([renamed]);
  expect(widths()).toEqual([2.7, 2.7]);
});

it('setGuildThingGrowthPhase and setGuildThingVigor set and clear fields', () => {
  const store = useGardenStore();
  usePlanStateStore().state.guilds = [
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
  expect(usePlanStateStore().state.guilds[0]!.plants[0]).toMatchObject({
    growthPhase: 'young',
    vigor: 4,
  });

  store.setGuildThingGrowthPhase('g1', 't1', '');
  store.setGuildThingVigor('g1', 't1', undefined);
  expect(usePlanStateStore().state.guilds[0]!.plants[0]?.growthPhase).toBeUndefined();
  expect(usePlanStateStore().state.guilds[0]!.plants[0]?.vigor).toBeUndefined();
});

it('merges guild contents and observations as one undoable change', () => {
  const store = useGardenStore();
  const plant = {
    id: 'p1',
    plantId: 'comfrey',
    x: 2,
    y: 3,
    width: 4,
    height: 4,
    nameOrCultivar: 'Comfrey',
  };
  const otherPlant = { ...plant, id: 'p2', x: 20, growthPhase: 'established' as const };
  const original = [
    {
      id: 'a',
      name: 'A',
      observations: [
        { id: 'First', type: 'note' as const, date: '2026-01-01', text: 'First' },
      ],
      path: [],
      plants: [plant],
      mulchLevel: 1 as const,
    },
    {
      id: 'b',
      name: 'B',
      observations: [
        { id: 'Second', type: 'note' as const, date: '2026-01-01', text: 'Second' },
      ],
      path: [],
      plants: [otherPlant],
      mulchLevel: 2 as const,
    },
  ];
  const merged = [
    {
      ...original[0],
      name: 'A + B',
      observations: original.flatMap((g) => g.observations),
      plants: [plant, otherPlant],
    },
  ];
  usePlanStateStore().state.guilds = structuredClone(original);
  expect(store.mergeGuilds('a', 'b')).toBe(true);
  expect(usePlanStateStore().state.guilds).toEqual(merged);
  usePlanCommandHistory().undo();
  expect(usePlanStateStore().state.guilds).toEqual(original);
  usePlanCommandHistory().redo();
  expect(usePlanStateStore().state.guilds).toEqual(merged);
});

it('ignores missing guilds and self merges', () => {
  const store = useGardenStore();
  const guild = { id: 'a', name: 'A', path: [], plants: [], mulchLevel: 1 as const };
  usePlanStateStore().state.guilds = [guild];
  expect([
    store.mergeGuilds('a', 'a'),
    store.mergeGuilds('a', 'missing'),
    store.mergeGuilds('missing', 'a'),
  ]).toEqual([false, false, false]);
  expect(usePlanStateStore().state.guilds).toEqual([guild]);
});

it('records dated observations for each scope and undoes one entry at a time', () => {
  const { store, guild, thing } = createGuildWithPlant();
  const date = '2026-04-05';
  store.recordObservation({ date, text: 'Frost', type: 'note' });
  store.recordObservation(
    { date, text: 'Sheltered', type: 'note' },
    { guildId: guild.id },
  );
  store.recordObservation(
    { date, text: 'First flower', type: 'note' },
    { guildId: guild.id, thingId: thing.id },
  );
  store.recordObservation(
    { date, text: 'More flowers', type: 'note' },
    { guildId: guild.id, thingId: thing.id },
  );
  store.recordObservation(
    { date, text: '  ', type: 'note' },
    { guildId: guild.id, thingId: thing.id },
  );
  store.recordObservation(
    { date, text: 'Lost target', type: 'note' },
    { guildId: guild.id, thingId: 'missing' },
  );
  expect(store.observations).toMatchObject([{ date, text: 'Frost' }]);
  expect(store.guilds[0]).toMatchObject({
    observations: [{ date, text: 'Sheltered' }],
    plants: [
      {
        observations: [
          { date, text: 'First flower' },
          { date, text: 'More flowers' },
        ],
      },
    ],
  });
  usePlanCommandHistory().undo();
  expect(store.guilds[0]?.plants[0]?.observations).toMatchObject([
    { date, text: 'First flower' },
  ]);
});

it('keeps referenced plants and makes unused plant deletion undoable', () => {
  const garden = useGardenStore();
  const history = usePlanCommandHistory();
  const used = { id: 'used', speciesId: 'basil', cultivarId: null };
  const unused = { id: 'unused', speciesId: 'mint', cultivarId: null };
  usePlanStateStore().state.plants = [used, unused];
  usePlanStateStore().state.guilds = [
    {
      id: 'bed',
      name: 'Bed',
      path: [],
      mulchLevel: 1,
      plants: [
        {
          id: 'instance',
          plantId: used.id,
          nameOrCultivar: 'Basil',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
        },
      ],
    },
  ];
  expect(garden.removePlant(used.id)).toBe(false);
  expect(history.canUndo).toBe(false);
  expect(usePlanStateStore().state.plants).toEqual([used, unused]);
  expect(garden.removePlant(unused.id)).toBe(true);
  expect(usePlanStateStore().state.plants).toEqual([used]);
  history.undo();
  expect(usePlanStateStore().state.plants).toEqual([used, unused]);
});

const createGuildWithPlant = () => {
  const store = useGardenStore();
  const guild = store.createGuild();
  store.addCatalogPlantToGuild(guild.id, 'apple', null);
  const thing = store.guilds[0]!.plants[0]!;
  return { store, guild, thing };
};

it('places and redraws individuals as undoable edits without losing their notes', () => {
  const { store, guild, thing } = createGuildWithPlant();
  const history = usePlanCommandHistory();
  store.recordObservation(
    { date: '2026-01-01', text: 'Keep this tree', type: 'note' },
    {
      guildId: guild.id,
      thingId: thing.id,
    },
  );
  history.clear();
  const bounds = { x: 25, y: 40, width: 32 };
  store.setPlantPlacement(guild.id, thing.id, bounds);
  expect(store.guilds[0]?.plants).toMatchObject([
    {
      ...bounds,
      height: 32,
      id: thing.id,
      observations: [{ text: 'Keep this tree' }],
      placed: true,
    },
  ]);
  history.undo();
  expect(store.guilds[0]?.plants).toMatchObject([
    {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      observations: [{ text: 'Keep this tree' }],
      placed: false,
    },
  ]);
  history.redo();
  expect(store.guilds[0]?.plants).toMatchObject([{ ...bounds, id: thing.id }]);
});

it('rejects invalid plant placements and moves individuals with their guild', () => {
  const { store, guild, thing } = createGuildWithPlant();
  const before = JSON.parse(JSON.stringify(store.guilds));
  store.setPlantPlacement(guild.id, thing.id, { x: NaN, y: 0, width: 10 });
  store.setPlantPlacement(guild.id, thing.id, { x: 0, y: 0, width: 0 });
  store.setPlantPlacement(guild.id, 'missing', { x: 0, y: 0, width: 10 });
  expect(store.guilds).toEqual(before);
  store.setPlantPlacement(guild.id, thing.id, { x: 5, y: 5, width: 16 });
  const path = [
    [
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 0 },
      ],
    ],
  ];
  store.setGuildPath(guild.id, path);
  store.setGuildPath(
    guild.id,
    path.map((p) =>
      p.map((r) => r.map((point) => ({ x: point.x + 20, y: point.y - 10 }))),
    ),
    true,
  );
  expect(store.guilds[0]?.plants).toMatchObject([
    { x: 25, y: -5, width: 16, height: 16 },
  ]);
  usePlanCommandHistory().undo();
  expect(store.guilds[0]?.plants).toMatchObject([{ x: 5, y: 5 }]);
});

it('removes only the placement and restores it with undo', () => {
  const { store, guild, thing } = createGuildWithPlant();
  store.recordObservation(
    { date: '2026-01-01', text: 'My tree', type: 'note' },
    {
      guildId: guild.id,
      thingId: thing.id,
    },
  );
  store.setGuildThingVigor(guild.id, thing.id, 4);
  store.setPlantPlacement(guild.id, thing.id, { x: 20, y: 30, width: 40 });
  const placed = JSON.parse(JSON.stringify(store.guilds));
  store.removePlantPlacement(guild.id, thing.id);
  expect(store.guilds[0]?.plants).toMatchObject([
    {
      id: thing.id,
      plantId: thing.plantId,
      observations: [{ text: 'My tree' }],
      vigor: 4,
      placed: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
  ]);
  usePlanCommandHistory().undo();
  expect(store.guilds).toEqual(placed);
});

it('requires explicit placement even when legacy coordinates have positive dimensions', () => {
  const bounds = { width: 16, height: 16 };
  expect([
    hasPlantPlacement(bounds),
    hasPlantPlacement({ ...bounds, placed: false }),
    hasPlantPlacement({ ...bounds, placed: true }),
  ]).toEqual([false, false, true]);
});
