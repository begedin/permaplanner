import type { CatalogSpecies } from './plantCatalog';
import { plantSpeciesDisplayLabel } from './resolvePlant';

export type CatalogPlantPick = {
  id: string;
  speciesId: string;
  speciesName: string;
  speciesLatin?: string;
  cultivarId: string | null;
  rowLabel: string;
  inputLabel: string;
  /** Lowercase haystack for combobox filtering (English + Latin). */
  searchText: string;
};

export type CatalogPickGroup = {
  speciesId: string;
  speciesName: string;
  speciesLatin?: string;
  picks: CatalogPlantPick[];
};

const labelWithLatin = (base: string, latin: string | undefined): string =>
  latin ? `${base} (${latin})` : base;

const catalogPickSearchText = (
  species: CatalogSpecies,
  cultivar: CatalogSpecies['cultivars'][number] | undefined,
): string =>
  [species.name, species.name_latin, cultivar?.name, cultivar?.name_latin]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();

export const buildCatalogPickGroups = (
  speciesList: CatalogSpecies[],
): CatalogPickGroup[] => {
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
        speciesLatin: s.name_latin,
        cultivarId: null,
        rowLabel: 'Default',
        inputLabel: plantSpeciesDisplayLabel(s.name, s.name_latin),
        searchText: catalogPickSearchText(s, undefined),
      });
    } else {
      picks.push({
        id: `${s.id}::`,
        speciesId: s.id,
        speciesName: s.name,
        speciesLatin: s.name_latin,
        cultivarId: null,
        rowLabel: 'Default',
        inputLabel: labelWithLatin(`${s.name} (default)`, s.name_latin),
        searchText: catalogPickSearchText(s, undefined),
      });
      for (const c of s.cultivars) {
        picks.push({
          id: `${s.id}::${c.id}`,
          speciesId: s.id,
          speciesName: s.name,
          speciesLatin: s.name_latin,
          cultivarId: c.id,
          rowLabel: labelWithLatin(c.name, c.name_latin),
          inputLabel: `${plantSpeciesDisplayLabel(s.name, s.name_latin)} — ${labelWithLatin(c.name, c.name_latin)}`,
          searchText: catalogPickSearchText(s, c),
        });
      }
    }
    out.push({
      speciesId: s.id,
      speciesName: s.name,
      speciesLatin: s.name_latin,
      picks,
    });
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

export const defaultCatalogPick = (
  speciesList: CatalogSpecies[],
): CatalogPlantPick | null => {
  const groups = buildCatalogPickGroups(speciesList);
  return groups[0]?.picks[0] ?? null;
};
