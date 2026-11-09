import type { Guild, UserPlant } from './gardenTypes';
import type { OnboardingState } from './onboardingTypes';

export const GARDEN_DOCUMENT_VERSION = 8 as const;

export type ScaleUnit = 'unspecified' | 'm' | 'ft' | 'cm' | 'in' | 'yd';
export const SCALE_UNITS: { value: ScaleUnit; label: string }[] = [
  { value: 'unspecified', label: 'Unspecified' },
  { value: 'm', label: 'Meters' },
  { value: 'ft', label: 'Feet' },
  { value: 'cm', label: 'Centimeters' },
  { value: 'in', label: 'Inches' },
  { value: 'yd', label: 'Yards' },
];
export type Landmark = {
  id: string;
  name: string;
  /** Centre in map coordinates; rotation is clockwise degrees. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

/** Current backend document, also used unchanged for local exports. */
export type GardenDocument = {
  version: typeof GARDEN_DOCUMENT_VERSION;
  /** Monotonic plan version for comparing remote saves. */
  syncRevision: number;
  plants: UserPlant[];
  guilds: Guild[];
  landmarks: Landmark[];
  /** Empty when no optional plot border has been drawn. */
  plotBorder: { x: number; y: number }[];
  mapScale: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    linePhysicalLength: number;
    unit: ScaleUnit;
  };
  backgroundOpacity: number;
  backgroundImage?: string;
  onboardingState: OnboardingState;
};

/** Omitted image keeps the server image; null explicitly clears it. */
export type GardenDocumentPayload = Omit<GardenDocument, 'backgroundImage'> & {
  backgroundImage?: string | null;
};
