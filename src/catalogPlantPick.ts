import type { CatalogSpecies } from './plantCatalog';

export type CatalogPlantPick = {
  id: string;
  speciesId: string;
  speciesName: string;
  cultivarId: string | null;
  rowLabel: string;
  inputLabel: string;
};

export type CatalogPickGroup = {
  speciesId: string;
  speciesName: string;
  picks: CatalogPlantPick[];
};

export const buildCatalogPickGroups = (speciesList: CatalogSpecies[]): CatalogPickGroup[] => {
  const species = [...speciesList].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  const out: CatalogPickGroup[] = [];
  for (const s of species) {
    const picks: CatalogPlantPick[] = [];
    if (s.cultivars.length === 0) {
      picks.push({
        id: `${s.id}::`,
        speciesId: s.id,
        speciesName: s.name,
        cultivarId: null,
        rowLabel: 'Default',
        inputLabel: s.name,
      });
    } else {
      picks.push({
        id: `${s.id}::`,
        speciesId: s.id,
        speciesName: s.name,
        cultivarId: null,
        rowLabel: 'Default',
        inputLabel: `${s.name} (default)`,
      });
      for (const c of s.cultivars) {
        picks.push({
          id: `${s.id}::${c.id}`,
          speciesId: s.id,
          speciesName: s.name,
          cultivarId: c.id,
          rowLabel: c.name,
          inputLabel: `${s.name} — ${c.name}`,
        });
      }
    }
    out.push({ speciesId: s.id, speciesName: s.name, picks });
  }
  return out;
};

export const catalogPickForSpeciesCultivar = (
  groups: CatalogPickGroup[],
  speciesId: string,
  cultivarId: string | null,
): CatalogPlantPick | undefined => {
  const target = `${speciesId}::${cultivarId ?? ''}`;
  for (const g of groups) {
    const hit = g.picks.find((p) => p.id === target);
    if (hit) {
      return hit;
    }
  }
  return undefined;
};

export const defaultCatalogPick = (speciesList: CatalogSpecies[]): CatalogPlantPick | null => {
  const groups = buildCatalogPickGroups(speciesList);
  return groups[0]?.picks[0] ?? null;
};
