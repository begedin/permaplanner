import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import type { GardenThing, UserPlant } from '../../src/gardenTypes';
import { waitForMainApp } from '../helpers';

type Canopy = { x: number; y: number; diameter: number };
type LayoutPlant = { plant: UserPlant; individuals: Omit<GardenThing, 'plantId'>[] };

export const createGrannySmiths = (firstCanopy?: Canopy): LayoutPlant => ({
  plant: { id: 'apple_granny_smith', speciesId: 'apple', cultivarId: 'granny_smith' },
  individuals: ['first', 'second'].map((id, index) => {
    const canopy = index === 0 ? firstCanopy : undefined;
    return {
      id,
      nameOrCultivar: 'Granny Smith',
      x: canopy?.x ?? 5,
      y: canopy?.y ?? 5,
      width: canopy?.diameter ?? 16,
      height: canopy?.diameter ?? 16,
      placed: !!canopy,
      note: 'Keep this individual',
    };
  }),
});

export const createLayoutPlant = (
  plant: UserPlant,
  nameOrCultivar: string,
  { x, y, diameter }: Canopy,
): LayoutPlant => ({
  plant,
  individuals: [
    {
      id: `${plant.id}-1`,
      nameOrCultivar,
      x,
      y,
      width: diameter,
      height: diameter,
      placed: true,
      note: '',
    },
  ],
});

export const createStrawberry = (canopy: Canopy) =>
  createLayoutPlant(
    { id: 'strawberry', speciesId: 'strawberry', cultivarId: null },
    'Strawberry',
    canopy,
  );

export const importLayoutGarden = async (
  page: Page,
  plants: LayoutPlant[],
  { legacy = false } = {},
) => {
  const empty = JSON.parse(
    readFileSync(new URL('./emptyPlan.json', import.meta.url), 'utf8'),
  );
  const bed = {
    id: 'bed',
    name: 'Orchard',
    mulchLevel: 1,
    path: [
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 0 },
        ],
      ],
    ],
    plants: plants.flatMap(({ plant, individuals }) =>
      individuals.map(({ placed, ...individual }) => ({
        ...individual,
        plantId: plant.id,
        ...(legacy ? {} : { placed }),
      })),
    ),
  };
  const document = {
    ...empty,
    version: legacy ? 10 : 11,
    plants: plants.map(({ plant }) => plant),
    landmarks: [],
    paths: [],
    plotBorder: [],
    mapScale: { ...empty.mapScale, unit: 'm' },
    guilds: [
      bed,
      {
        ...bed,
        id: 'other',
        name: 'Other guild',
        plants: [],
        path: bed.path.map((polygon) =>
          polygon.map((ring) => ring.map(({ x, y }) => ({ x: x + 200, y }))),
        ),
      },
      { ...bed, id: 'unmapped', name: 'Unmapped guild', path: [], plants: [] },
    ],
  };
  await page.evaluate((document) => {
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: async () => [
        {
          getFile: async () =>
            new File([JSON.stringify(document)], 'layout.json', {
              type: 'application/json',
            }),
        },
      ],
    });
  }, document);
  await page.getByRole('button', { name: 'Import JSON file…' }).click();
  await waitForMainApp(page);
};
