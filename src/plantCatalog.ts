import rawCatalog from './data/plantCatalog.json';
import type { GuildFunction, GuildLayer } from './gardenTypes';

export type CatalogCultivar = {
  id: string;
  name: string;
  defaultEmoji?: string;
  functions?: GuildFunction[];
  layers?: GuildLayer[];
};

export type CatalogSpecies = {
  id: string;
  name: string;
  defaultEmoji: string;
  functions: GuildFunction[];
  layers: GuildLayer[];
  cultivars: CatalogCultivar[];
};

export type PlantCatalogFile = {
  species: CatalogSpecies[];
};

export const plantCatalog = rawCatalog as PlantCatalogFile;

export const getSpecies = (id: string): CatalogSpecies | undefined =>
  plantCatalog.species.find((s) => s.id === id);

export const getCultivar = (species: CatalogSpecies, cultivarId: string): CatalogCultivar | undefined =>
  species.cultivars.find((c) => c.id === cultivarId);
