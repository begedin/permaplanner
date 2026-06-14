import type { GardenDocument } from '../gardenDocument';
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
  importSource?: string;
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

export const createGarden = async (name?: string): Promise<GardenRecord> => {
  const data = await expectJson<{ garden: GardenRecord }>(
    await apiFetch('/api/gardens', {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  );
  return data.garden;
};

export const fetchGarden = async (id: string): Promise<GardenRecord> => {
  const data = await expectJson<{ garden: GardenRecord }>(
    await apiFetch(`/api/gardens/${id}`),
  );
  return data.garden;
};

export const updateGarden = async (
  id: string,
  document: GardenDocument,
): Promise<number> => {
  const data = await expectJson<{ syncRevision: number }>(
    await apiFetch(`/api/gardens/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ document, syncRevision: document.syncRevision }),
    }),
  );
  return data.syncRevision;
};

export const importGardenDocument = async (opts: {
  document: GardenDocument;
  name?: string;
  importSource?: 'local' | 'github';
}): Promise<GardenRecord> => {
  const data = await expectJson<{ garden: GardenRecord }>(
    await apiFetch('/api/legacy-import/local', {
      method: 'POST',
      body: JSON.stringify({
        document: opts.document,
        name: opts.name,
        import_source: opts.importSource,
      }),
    }),
  );
  return data.garden;
};

export const deleteGarden = async (id: string): Promise<void> => {
  await apiFetch(`/api/gardens/${id}`, { method: 'DELETE' });
};
