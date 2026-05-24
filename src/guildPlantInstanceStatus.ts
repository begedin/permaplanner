export const GrowthPhase = {
  sown: 'sown',
  germinated: 'germinated',
  transplanted: 'transplanted',
  young: 'young',
  established: 'established',
  producing: 'producing',
  post_production: 'post_production',
} as const;

export type GrowthPhase = (typeof GrowthPhase)[keyof typeof GrowthPhase];

export const GROWTH_PHASE_ORDER: Record<GrowthPhase, number> = {
  sown: 0,
  germinated: 1,
  transplanted: 1,
  young: 2,
  established: 3,
  producing: 4,
  post_production: 5,
};

export const GROWTH_PHASE_LABEL: Record<GrowthPhase, string> = {
  sown: 'Sown',
  germinated: 'Germinated',
  transplanted: 'Transplanted',
  young: 'Young',
  established: 'Established',
  producing: 'Producing',
  post_production: 'Post-production',
};

export const GROWTH_PHASES_FOR_SELECT: GrowthPhase[] = [
  GrowthPhase.sown,
  GrowthPhase.germinated,
  GrowthPhase.transplanted,
  GrowthPhase.young,
  GrowthPhase.established,
  GrowthPhase.producing,
  GrowthPhase.post_production,
];

export type PlantVigor = 1 | 2 | 3 | 4 | 5;

export const PLANT_VIGOR_LABEL: Record<PlantVigor, string> = {
  1: 'Struggling',
  2: 'Stressed',
  3: 'Fair',
  4: 'Healthy',
  5: 'Thriving',
};

export const PLANT_VIGORS_FOR_SELECT: PlantVigor[] = [1, 2, 3, 4, 5];

export const coerceGrowthPhase = (v: unknown): GrowthPhase | undefined => {
  if (typeof v === 'string' && v in GrowthPhase) {
    return v as GrowthPhase;
  }
  return undefined;
};

export const coercePlantVigor = (v: unknown): PlantVigor | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const r = Math.round(v);
    if (r >= 1 && r <= 5) {
      return r as PlantVigor;
    }
  }
  return undefined;
};

export const averageGrowthPhase = (
  phases: readonly (GrowthPhase | undefined)[],
): GrowthPhase | null => {
  const set = phases.filter((p): p is GrowthPhase => p !== undefined);
  if (set.length === 0) {
    return null;
  }
  const avgOrder =
    set.reduce((sum, p) => sum + GROWTH_PHASE_ORDER[p], 0) / set.length;
  const targetOrder = Math.round(avgOrder);
  const atOrder = GROWTH_PHASES_FOR_SELECT.filter(
    (p) => GROWTH_PHASE_ORDER[p] === targetOrder,
  );
  if (atOrder.length === 1) {
    return atOrder[0]!;
  }
  const counts = new Map<GrowthPhase, number>();
  for (const p of set) {
    if (GROWTH_PHASE_ORDER[p] === targetOrder) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }
  let best: GrowthPhase | null = null;
  let bestCount = 0;
  for (const p of atOrder) {
    const c = counts.get(p) ?? 0;
    if (c > bestCount) {
      best = p;
      bestCount = c;
    }
  }
  return best ?? atOrder[0]!;
};

export const averagePlantVigor = (
  vigors: readonly (PlantVigor | undefined)[],
): PlantVigor | null => {
  const set = vigors.filter((v): v is PlantVigor => v !== undefined);
  if (set.length === 0) {
    return null;
  }
  const avg = set.reduce((sum, v) => sum + v, 0) / set.length;
  const rounded = Math.round(avg);
  return Math.min(5, Math.max(1, rounded)) as PlantVigor;
};
