import { readonly } from 'vue';
import { defineStore } from 'pinia';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { cloneGuildPath } from './guildPathClip';
import type { MapShape } from './gardenDocument';
import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';

export const useMapShapeStore = defineStore('mapShapes', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const items = (feature: ShapeFeature) =>
    readonly(plan.state[SHAPE_FEATURES[feature].collection]);
  const save = (feature: ShapeFeature, shape: MapShape) => {
    history.runMutation(() => {
      const shapes = plan.state[SHAPE_FEATURES[feature].collection];
      const index = shapes.findIndex((item) => item.id === shape.id);
      const saved = { ...shape, path: cloneGuildPath(shape.path) };
      if (index < 0) shapes.push(saved);
      else shapes[index] = saved;
    });
  };
  const remove = (feature: ShapeFeature, id: string) => {
    history.runMutation(() => {
      const collection = SHAPE_FEATURES[feature].collection;
      plan.state[collection] = plan.state[collection].filter((item) => item.id !== id);
    });
  };
  return { items, save, remove };
});
