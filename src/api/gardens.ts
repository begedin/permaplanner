import type { GardenDocument, GardenDocumentPayload } from '../gardenDocument';
import { withPersistedGuildPlantLabels } from '../guildPlantLabels';
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
  const data = await expectJson<{ syncRevision: number }>(
    await apiFetch(`/api/gardens/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        document: withPersistedGuildPlantLabels(document),
        syncRevision: document.syncRevision,
      }),
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
