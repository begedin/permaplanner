import { expect, it } from 'vitest';

import {
  averageGrowthPhase,
  averagePlantVigor,
  GrowthPhase,
} from './guildPlantInstanceStatus';

it('averageGrowthPhase ignores unset values', () => {
  expect(
    averageGrowthPhase([GrowthPhase.young, undefined, GrowthPhase.producing]),
  ).toBe(GrowthPhase.established);
});

it('averageGrowthPhase breaks ties at the same order by majority', () => {
  expect(
    averageGrowthPhase([
      GrowthPhase.germinated,
      GrowthPhase.transplanted,
      GrowthPhase.transplanted,
    ]),
  ).toBe(GrowthPhase.transplanted);
});

it('averagePlantVigor ignores unset values and rounds', () => {
  expect(averagePlantVigor([4, undefined, 5])).toBe(5);
  expect(averagePlantVigor([1, 2])).toBe(2);
});

it('averageGrowthPhase returns null when nothing is set', () => {
  expect(averageGrowthPhase([undefined, undefined])).toBeNull();
});

it('averagePlantVigor returns null when nothing is set', () => {
  expect(averagePlantVigor([undefined])).toBeNull();
});
