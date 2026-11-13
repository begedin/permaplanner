import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { waitForMainApp } from '../helpers';

export const importLayoutGarden = async (
  page: Page,
  {
    placed = false,
    legacy = false,
    canopySize = 20,
  }: { placed?: boolean; legacy?: boolean; canopySize?: number } = {},
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
    plants: ['first', 'second'].map((id, index) => ({
      id,
      plantId: 'apple_granny_smith',
      nameOrCultivar: 'Granny Smith',
      x: placed ? 40 : 5,
      y: placed ? 40 : 5,
      width: placed && index === 0 ? canopySize : 16,
      height: placed && index === 0 ? canopySize : 16,
      ...(legacy ? {} : { placed: placed && index === 0 }),
      note: 'Keep this individual',
    })),
  };
  const document = {
    ...empty,
    version: legacy ? 10 : 11,
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
