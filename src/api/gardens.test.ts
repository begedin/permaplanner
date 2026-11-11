import legacyBoundaryCases from '../../test/fixtures/guild-boundaries-v8.json';
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
  landmarks: [],
  paths: [],
  plotBorder: [],
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
        [
          [
            { x: 10, y: 20 },
            { x: 30, y: 20 },
            { x: 30, y: 40 },
            { x: 10, y: 40 },
            { x: 10, y: 20 },
          ],
        ],
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
          note: 'Prune after harvest\nCheck new growth',
          growthPhase: 'young',
          vigor: 4,
        },
      ],
    },
  ],
  mapScale: {
    unit: 'm',
    start: { x: 10, y: 20 },
    end: { x: 110, y: 20 },
    linePhysicalLength: 25,
  },
  backgroundOpacity: 0.55,
  backgroundImage: 'data:image/png;base64,aW1hZ2U=',
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

it('uploads a changed background as a file while preserving the document and export', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ syncRevision: 4 })));
  expect(await updateGarden('garden1', document)).toBe(4);
  const [, request] = fetchMock.mock.calls[0]!;
  const form = request?.body as FormData;
  const { backgroundImage, ...data } = document;
  expect(JSON.parse(String(form.get('document')))).toEqual(data);
  expect(request?.headers).not.toHaveProperty('Content-Type');
  const file = form.get('backgroundImage') as File;
  expect(file).toMatchObject({ type: 'image/png', size: 5 });
  const uploaded = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  expect(uploaded).toBe(backgroundImage);
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

const legacyDocument = {
  ...document,
  version: 7,
  guilds: document.guilds.map((guild) => ({ ...guild, path: guild.path.flat(2) })),
};

const splitDocument = {
  ...legacyDocument,
  guilds: document.guilds.map(({ path: _path, plants, ...guild }) => ({
    ...guild,
    plants: plants.map(
      ({ x: _x, y: _y, width: _width, height: _height, nameOrCultivar, ...plant }) => ({
        ...plant,
        name: nameOrCultivar,
      }),
    ),
  })),
  guildLocations: legacyDocument.guilds.map(({ id, path, plants }) => ({
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

it.each([undefined, null])(
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

it('imports older documents without plant notes unchanged', async () => {
  const olderDocument = structuredClone(document);
  for (const guild of olderDocument.guilds) {
    for (const plant of guild.plants) delete plant.note;
  }
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ garden: { id: 'garden1', document: olderDocument } })),
  );
  await importJsonText(buildLocalPlanJsonText(olderDocument));
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
    document: olderDocument,
  });
});

it.each([legacyDocument, splitDocument])(
  'upgrades version 5 local files without guessing their unit',
  async (input) => {
    const { landmarks: _landmarks, ...old } = input;
    const { unit: _unit, ...mapScale } = old.mapScale;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ garden: { id: 'garden1' } })),
    );
    await importJsonText(JSON.stringify({ ...old, version: 5, mapScale }));
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toEqual({
      document: {
        ...document,
        landmarks: [],
        paths: [],
        plotBorder: [],
        mapScale: { ...mapScale, unit: 'unspecified' },
      },
    });
  },
);

it('adds an optional empty border to version 6 imports', async () => {
  const { plotBorder: _border, ...old } = legacyDocument;
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ garden: { id: 'garden1' } })),
  );
  await importJsonText(JSON.stringify({ ...old, version: 6 }));
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ document });
});

it.each(legacyBoundaryCases)(
  'converts $name using the migration geometry contract',
  async ({ path, expected }) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ garden: { id: 'garden1' } })),
    );
    await importJsonText(
      JSON.stringify({
        ...legacyDocument,
        guilds: legacyDocument.guilds.map((guild) => ({ ...guild, path })),
      }),
    );
    const converted = {
      ...document,
      guilds: document.guilds.map((guild) => ({ ...guild, path: expected })),
    };
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      document: converted,
    });
    expect(JSON.parse(buildLocalPlanJsonText(converted))).toEqual(converted);
  },
);

it('converts version 8 rectangles and borders without changing their placement or metadata', async () => {
  const landmark = {
    id: 'shed',
    name: 'Shed',
    x: 100,
    y: 50,
    width: 80,
    height: 40,
    rotation: 35,
  };
  const border = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 80 },
  ];
  const old = { ...document, version: 8, landmarks: [landmark], plotBorder: border };
  const before = structuredClone(old);
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ garden: { id: 'garden1' } })),
  );
  await importLocalDocument(old);
  const converted = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).document;
  expect(converted).toEqual({
    ...document,
    landmarks: [
      {
        ...landmark,
        path: [
          [
            [
              { x: -0.5, y: -0.5 },
              { x: 0.5, y: -0.5 },
              { x: 0.5, y: 0.5 },
              { x: -0.5, y: 0.5 },
              { x: -0.5, y: -0.5 },
            ],
          ],
        ],
      },
    ],
    plotBorder: [[[...border, border[0]]]],
  });
  expect(old).toEqual(before);
  expect(JSON.parse(buildLocalPlanJsonText(converted))).toEqual(converted);
});

it('imports version 9 gardens with an empty paths collection', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ garden: { id: 'garden1' } })),
  );
  const { paths: _paths, ...old } = document;
  await importJsonText(JSON.stringify({ ...old, version: 9 }));
  expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)).document).toEqual(
    document,
  );
});
