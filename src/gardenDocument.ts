import type { Guild, UserPlant } from './gardenTypes';
import type { OnboardingState } from './onboardingTypes';

export const GARDEN_DOCUMENT_VERSION = 5 as const;

/** Current backend document, also used unchanged for local exports. */
export type GardenDocument = {
  version: typeof GARDEN_DOCUMENT_VERSION;
  /** Monotonic plan version for comparing remote saves. */
  syncRevision: number;
  plants: UserPlant[];
  guilds: Guild[];
  mapScale: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    linePhysicalLength: number;
  };
  backgroundOpacity: number;
  backgroundImage?: string;
  onboardingState: OnboardingState;
};

/** Omitted image keeps the server image; null explicitly clears it. */
export type GardenDocumentPayload = Omit<GardenDocument, 'backgroundImage'> & {
  backgroundImage?: string | null;
};
