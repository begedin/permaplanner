import { expect, it } from 'vitest';

import type { Plant } from './gardenTypes';
import {
  functionLabelTooltip,
  guildPlantTooltipRows,
  layerLabelTooltip,
  monthAspectTooltip,
  monthHeaderTooltip,
} from './guildPlantTooltips';

const applePlant = (): Plant => ({
  id: 'p-apple',
  speciesId: 'apple',
  cultivarId: null,
  name: 'Apple',
  cultivar: null,
  iconId: 'apple',
  functions: ['edible', 'pollinator_attractor'],
  layers: ['overstory'],
});

const basilPlant = (): Plant => ({
  id: 'p-basil',
  speciesId: 'basil',
  cultivarId: null,
  name: 'Basil',
  cultivar: null,
  iconId: 'leaf-herb',
  functions: ['edible', 'pest_repellent'],
  layers: ['herb'],
});

it('groups duplicate guild placements by plant id', () => {
  const rows = guildPlantTooltipRows(['p-apple', 'p-apple', 'p-basil'], (id) =>
    id === 'p-apple' ? applePlant() : basilPlant(),
  );
  expect(rows).toEqual([
    expect.objectContaining({ label: 'Apple', count: 2 }),
    expect.objectContaining({ label: 'Basil', count: 1 }),
  ]);
});

it('lists plants for a function label tooltip', () => {
  const rows = guildPlantTooltipRows(['p-apple', 'p-basil'], (id) =>
    id === 'p-apple' ? applePlant() : basilPlant(),
  );
  expect(functionLabelTooltip(rows, 'edible', 'Edible')).toBe('Edible: Apple, Basil');
  expect(functionLabelTooltip(rows, 'mulcher', 'Mulcher')).toBe('Mulcher: none');
});

it('lists plants for a layer label tooltip', () => {
  const rows = guildPlantTooltipRows(['p-apple', 'p-basil'], (id) =>
    id === 'p-apple' ? applePlant() : basilPlant(),
  );
  expect(layerLabelTooltip(rows, 'herb', 'Herb')).toBe('Herb: Basil');
});

it('lists plants for month fruit, bloom, and header tooltips', () => {
  const rows = guildPlantTooltipRows(['p-apple', 'p-basil'], (id) =>
    id === 'p-apple' ? applePlant() : basilPlant(),
  );
  expect(monthAspectTooltip(rows, 7, 'fruiting', 'Aug')).toBe('Aug fruit: Apple');
  expect(monthAspectTooltip(rows, 6, 'blooming', 'Jul')).toBe('Jul bloom: Basil');
  expect(monthHeaderTooltip(rows, 6, 'Jul')).toBe('Jul: Basil');
  expect(monthHeaderTooltip(rows, 7, 'Aug')).toBe('Aug: Apple, Basil');
});
