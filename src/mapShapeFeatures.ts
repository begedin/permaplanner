import type { UiIconId } from './uiIcons/iconIds';

export type ShapeFeature = 'landmark' | 'path';
export const SHAPE_FEATURES: Record<
  ShapeFeature,
  {
    collection: 'landmarks' | 'paths';
    label: string;
    fill: string;
    stroke: string;
    icon: UiIconId;
  }
> = {
  landmark: {
    collection: 'landmarks',
    label: 'Landmark',
    fill: '#a98b6833',
    stroke: '#806344',
    icon: 'landmark',
  },
  path: {
    collection: 'paths',
    label: 'Path',
    fill: '#c9b89599',
    stroke: '#806344',
    icon: 'path',
  },
};
