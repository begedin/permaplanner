import { expect, it } from 'vitest';
import sharedFixtures from '../test/fixtures/plant_resolution.json';
import type { UserPlant } from './gardenTypes';
import { resolvePhenology } from './plantCatalog';
import { resolveUserPlant } from './resolvePlant';

// JSON widens the domain's literal unions; this is the shared fixture boundary.
const fixtures = sharedFixtures as {
  name: string;
  plant: UserPlant;
  expected: Record<string, unknown>;
}[];

it.each(fixtures)('shared resolution contract: $name', ({ plant, expected }) => {
  const resolved = resolveUserPlant(plant);
  const periods = resolvePhenology(plant.speciesId, plant.cultivarId);
  expect({
    ...resolved,
    nameLatin: resolved.nameLatin ?? null,
    cultivarLatin: resolved.cultivarLatin ?? null,
    blooming: periods.blooming ?? null,
    harvest: periods.harvest ?? null,
  }).toEqual(expected);
});
