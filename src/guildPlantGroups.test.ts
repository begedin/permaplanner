import { expect, it } from 'vitest';

import type { GardenThing, Plant } from './gardenTypes';
import {
  GROUP_HEADER_MAX_PHASE_ICONS,
  buildGroupedGuildPlants,
} from './guildPlantGroups';

const plant = (id: string): Plant => ({
  id,
  speciesId: 'comfrey',
  cultivarId: null,
  name: 'Comfrey',
  cultivar: null,
  iconId: 'flower-spike',
  functions: [],
  layers: [],
});

const thing = (
  overrides: Partial<GardenThing> & Pick<GardenThing, 'id' | 'plantId'>,
): GardenThing => ({
  height: 10,
  width: 10,
  x: 0,
  y: 0,
  nameOrCultivar: 'x',
  ...overrides,
});

it('averages vigor across set instances and ignores unset ones', () => {
  const rows = buildGroupedGuildPlants(
    [
      thing({ id: 'a', plantId: 'plant', vigor: 4 }),
      thing({ id: 'b', plantId: 'plant' }),
      thing({ id: 'c', plantId: 'plant', vigor: 4 }),
    ],
    () => plant('plant'),
  );
  expect(rows).toMatchObject([{ plantId: 'plant', averageVigor: 4, count: 3 }]);
});

it('caps header phase icons and flags overflow past eight things', () => {
  const things = Array.from({ length: 9 }, (_, i) =>
    thing({
      id: `thing-${i}`,
      plantId: 'plant',
      growthPhase: i % 2 === 0 ? 'young' : undefined,
    }),
  );
  const rows = buildGroupedGuildPlants(things, () => plant('plant'));
  expect(rows[0]).toMatchObject({
    showPhaseOverflow: true,
    count: 9,
  });
  expect(rows[0]!.headerPhaseSlots.length).toBeLessThanOrEqual(
    GROUP_HEADER_MAX_PHASE_ICONS,
  );
  expect(rows[0]!.headerPhaseSlots).toHaveLength(4);
});
