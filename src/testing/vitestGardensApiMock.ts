import { vi } from 'vitest';

import { GARDEN_DOCUMENT_VERSION } from '../gardenDocument';
import { DEFAULT_ONBOARDING_STATE } from '../onboardingTypes';

vi.mock('../api/gardens', () => ({
  listGardens: vi
    .fn()
    .mockResolvedValue([
      {
        id: 'g1',
        name: 'Garden',
        syncRevision: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  fetchGarden: vi.fn().mockResolvedValue({
    id: 'g1',
    name: 'Garden',
    document: {
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: 0,
      plants: [],
      guilds: [],
      mapScale: {
        start: { x: 20, y: 20 },
        end: { x: 150, y: 20 },
        linePhysicalLength: 1,
      },
      backgroundOpacity: 0.4,
      onboardingState: DEFAULT_ONBOARDING_STATE,
    },
  }),
  createGarden: vi.fn(),
  updateGarden: vi.fn(),
}));
