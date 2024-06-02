import { watch, type Ref } from 'vue';
import { useSceneStore } from './useSceneStore';
import { useDrawBox } from './useDrawBox';

export const useScene = (container: Ref<HTMLElement | SVGElement | undefined>) => {
  const { x, y, box, isDrawing } = useDrawBox(container);
  const scene = useSceneStore();

  watch(x, () => (scene.x = x.value));
  watch(y, () => (scene.y = y.value));
  watch(box, () => (scene.box = { ...box.value }));
  watch(isDrawing, () => (scene.isDrawing = isDrawing.value));
};
