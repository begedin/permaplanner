export const baseLayers = [
  'bg_1',
  'bg_2',
  'bg_3',
  'bg_4',
  'bg_5',
  'bg_6',
  'bg_7',
  'bg_8',
] as const;
export type BaseLayer = (typeof baseLayers)[number];

export const GuildFunction = {
  nitrogen_fixer: 'nitrogen_fixer',
  dynamic_accumulator: 'dynamic_accumulator',
  pollinator_attractor: 'pollinator_attractor',
  pest_repellent: 'pest_repellent',
  ground_cover: 'ground_cover',
  wildfire_suppressor: 'wildfire_suppressor',
  mulcher: 'mulcher',
  edible: 'edible',
  medicinal: 'medicinal',
} as const;

export type GuildFunction = (typeof GuildFunction)[keyof typeof GuildFunction];

export const GuildLayer = {
  overstory: 'overstory',
  understory: 'understory',
  shrub: 'shrub',
  ground_cover: 'ground_cover',
  vine: 'vine',
  herb: 'herb',
  root: 'root',
} as const;

export type GuildLayer = (typeof GuildLayer)[keyof typeof GuildLayer];

export const features = [
  'apple',
  'banana',
  'blueberry',
  'cherry',
  'lemon',
  'orange',
  'pear',
  'strawberry',
] as const;

export type Feature = (typeof features)[number];

export type Plant = {
  id: string;
  name: string;
  cultivar: string | null;
  background: BaseLayer;
  feature: Feature | null;
  feature_tint: string | null;
  functions: GuildFunction[];
  layers: GuildLayer[];
};

export type GardenThing = {
  id: string;
  nameOrCultivar: string;
  plantId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Guild = {
  id: string;
  name: string;
  path: { x: number; y: number }[];
  plants: GardenThing[];
};
