import { watch, type Ref } from 'vue';
import { useSceneStore } from './useSceneStore';
import { useDrawBox } from './useDrawBox';

export const useScene = (
  svgElement: Ref<SVGElement | undefined>,
  svgBGImageElement: Ref<SVGImageElement | undefined>,
) => {
  const { x, y, box, isDrawing } = useDrawBox(svgElement, svgBGImageElement);
  const store = useSceneStore();

  watch(x, (value) => (store.x = value), { immediate: true });
  watch(y, (value) => (store.y = value), { immediate: true });

  watch(
    box,
    () => {
      store.box.x = box.value.x;
      store.box.y = box.value.y;
      store.box.width = box.value.width;
      store.box.height = box.value.height;
    },
    { immediate: true },
  );
  watch(isDrawing, () => (store.isDrawing = isDrawing.value), { immediate: true });
};
