import type { GardenDocument, GardenDocumentPayload } from '../gardenDocument';
import { apiFetch, expectJson } from './client';

export type GardenSummary = {
  id: string;
  name: string;
  syncRevision: number;
  updatedAt: string;
};

export type GardenRecord = {
  id: string;
  name: string;
  syncRevision: number;
  fileVersion: number;
  document: GardenDocument;
  updatedAt: string;
  insertedAt: string;
};

export const listGardens = async (): Promise<GardenSummary[]> => {
  const data = await expectJson<{ gardens: GardenSummary[] }>(
    await apiFetch('/api/gardens'),
  );
  return data.gardens;
};

const readGardenRecord = async (response: Response): Promise<GardenRecord> => {
  const { garden } = await expectJson<{ garden: GardenRecord }>(response);
  return garden;
};

export const createGarden = async (name?: string): Promise<GardenRecord> =>
  readGardenRecord(
    await apiFetch('/api/gardens', {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  );

export const fetchGarden = async (id: string): Promise<GardenRecord> =>
  readGardenRecord(await apiFetch(`/api/gardens/${id}`));

export const updateGarden = async (
  id: string,
  document: GardenDocumentPayload,
): Promise<number> => {
  let body: string | FormData;
  if (typeof document.backgroundImage === 'string') {
    const { backgroundImage, ...data } = document;
    const comma = backgroundImage.indexOf(',');
    const type = backgroundImage.slice(5, comma).split(';')[0];
    const bytes = Uint8Array.from(atob(backgroundImage.slice(comma + 1)), (char) =>
      char.charCodeAt(0),
    );
    body = new FormData();
    body.append('document', JSON.stringify(data));
    body.append('backgroundImage', new Blob([bytes], { type }), 'background');
  } else {
    body = JSON.stringify({ document, syncRevision: document.syncRevision });
  }
  const data = await expectJson<{ syncRevision: number }>(
    await apiFetch(`/api/gardens/${id}`, {
      method: 'PUT',
      body,
    }),
  );
  return data.syncRevision;
};

export const importGardenDocument = async (opts: {
  document: unknown;
  name?: string;
}): Promise<GardenRecord> =>
  readGardenRecord(
    await apiFetch('/api/legacy-import/local', {
      method: 'POST',
      body: JSON.stringify({
        document: opts.document,
        name: opts.name,
      }),
    }),
  );

export const deleteGarden = async (id: string): Promise<void> => {
  await apiFetch(`/api/gardens/${id}`, { method: 'DELETE' });
};
