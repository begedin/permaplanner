import { apiFetch, ApiError, expectJson, readJson } from './client';

export type GardenShare = {
  id: string;
  url: string;
  createdAt: string;
};

export const listGardenShares = async (gardenId: string): Promise<GardenShare[]> => {
  const data = await expectJson<{ shares: GardenShare[] }>(
    await apiFetch(`/api/gardens/${gardenId}/shares`),
  );
  return data.shares;
};

export const createGardenShare = async (gardenId: string): Promise<GardenShare> => {
  const data = await expectJson<{ share: GardenShare }>(
    await apiFetch(`/api/gardens/${gardenId}/shares`, { method: 'POST' }),
  );
  return data.share;
};

export const revokeGardenShare = async (
  gardenId: string,
  shareId: string,
): Promise<void> => {
  const res = await apiFetch(`/api/gardens/${gardenId}/shares/${shareId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readJson(res));
  }
};
