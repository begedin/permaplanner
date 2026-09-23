import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { type GardenDocument } from '../gardenDocument';
import {
  importJsonText,
  importGardenDocument as importLocalDocument,
} from '../legacyImport/localFile';
import { buildLocalPlanJsonText } from '../permaplannerFileExport';
import { GARDEN_DOCUMENT_VERSION } from '../gardenDocument';
import { createGarden, fetchGarden, importGardenDocument, updateGarden } from './gardens';

vi.unmock('./gardens');

const document: GardenDocument = {
  version: GARDEN_DOCUMENT_VERSION,
  syncRevision: 3,
  plants: [
    {
      id: 'p1',
      speciesId: 'unknown',
      cultivarId: null,
      speciesOverride: { name: 'My herb' },
    },
  ],
  guilds: [
    {
      id: 'g1',
      name: 'Herbs',
      note: 'North bed',
      mulchLevel: 3,
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      plants: [
        {
          id: 't1',
          plantId: 'p1',
          nameOrCultivar: 'My herb',
          x: 5,
          y: 6,
          width: 7,
          height: 8,
          growthPhase: 'young',
          vigor: 4,
        },
      ],
    },
  ],
  mapScale: { start: { x: 10, y: 20 }, end: { x: 110, y: 20 }, linePhysicalLength: 25 },
  backgroundOpacity: 0.55,
  backgroundImage: 'data:image/png;base64,abc',
  onboardingState: 'done',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('saves and exports the same current document without splitting geometry', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ syncRevision: 4 })));
  expect(await updateGarden('garden1', document)).toBe(4);
  const [, request] = fetchMock.mock.calls[0]!;
  expect(JSON.parse(String(request?.body))).toEqual({ document, syncRevision: 3 });
  expect(JSON.parse(buildLocalPlanJsonText(document))).toEqual(document);
});

it.each([
  ['fetch', () => fetchGarden('garden1')],
  ['create', () => createGarden('Garden')],
  ['import', () => importGardenDocument({ document, name: 'Garden' })],
] as const)(
  '%s returns the current backend document unchanged',
  async (_name, operation) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ garden: { id: 'garden1', document } })),
    );
    expect(await operation()).toEqual({ id: 'garden1', document });
  },
);

const splitDocument = {
  ...document,
  guilds: document.guilds.map(({ path: _path, plants, ...guild }) => ({
    ...guild,
    plants: plants.map(
      ({ x: _x, y: _y, width: _width, height: _height, nameOrCultivar, ...plant }) => ({
        ...plant,
        name: nameOrCultivar,
      }),
    ),
  })),
  guildLocations: document.guilds.map(({ id, path, plants }) => ({
    id,
    path,
    plants: plants.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  })),
};

it.each([document, splitDocument])(
  'sends current-format JSON from local file import',
  async (input) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ garden: { id: 'garden1', document } })),
    );
    expect(await importJsonText(JSON.stringify(input), { name: 'Imported' })).toEqual({
      id: 'garden1',
      document,
    });
    const [path, request] = fetchMock.mock.calls[0]!;
    expect({
      path,
      method: request?.method,
      body: JSON.parse(String(request?.body)),
    }).toEqual({
      path: '/api/legacy-import/local',
      method: 'POST',
      body: { document, name: 'Imported' },
    });
  },
);

it('matches split geometry by id without mutating the input', async () => {
  const input = structuredClone(splitDocument);
  input.guildLocations.unshift({ id: 'unrelated', path: [], plants: [] });
  input.guildLocations[1]?.plants.unshift({
    id: 'unrelated',
    x: 99,
    y: 99,
    width: 99,
    height: 99,
  });
  const original = structuredClone(input);
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ garden: { id: 'garden1', document } })),
  );
  await importLocalDocument(input);
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ document });
  expect(input).toEqual(original);
});

it.each([
  { ...splitDocument, guildLocations: [] },
  { ...splitDocument, guildLocations: [{ id: 'g1', path: [], plants: [] }] },
  { ...splitDocument, guildLocations: null },
])('rejects incomplete split geometry before sending an import', async (input) => {
  await expect(importJsonText(JSON.stringify(input))).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([undefined, null, 'data:image/png;base64,new'])(
  'preserves background update semantics for %s',
  async (backgroundImage) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ syncRevision: 4 })));
    await updateGarden('garden1', { ...document, backgroundImage });
    const [, request] = fetchMock.mock.calls[0]!;
    const payload = JSON.parse(String(request?.body));
    if (backgroundImage === undefined) {
      expect(payload.document).not.toHaveProperty('backgroundImage');
    } else {
      expect(payload.document).toMatchObject({ backgroundImage });
    }
  },
);

it('surfaces a rejected import from the backend', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: 'invalid_version' }), { status: 422 }),
  );
  await expect(importJsonText('{"version":999}')).rejects.toMatchObject({
    status: 422,
    body: { error: 'invalid_version' },
  });
});
