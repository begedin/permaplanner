import { watch, type Ref } from 'vue';
import { useSceneStore } from './useSceneStore';
import { useDrawBox } from './useDrawBox';

export const useScene = (
  svgElement: Ref<SVGElement | undefined>,
  stageElement: Ref<SVGElement | undefined>,
) => {
  const { x, y, box, isDrawing } = useDrawBox(svgElement, stageElement);
  const store = useSceneStore();

  watch(
    x,
    (value) => {
      store.x = value;
      // CTM-based coords are already viewBox / world units (cameraToWorld was for old pixel math).
      store.worldX = value;
    },
    { immediate: true },
  );
  watch(
    y,
    (value) => {
      store.y = value;
      store.worldY = value;
    },
    { immediate: true },
  );

  watch(
    box,
    () => {
      store.box = {
        x: box.value.x,
        y: box.value.y,
        width: box.value.width,
        height: box.value.height,
      };

      store.worldBox = {
        x: box.value.x,
        y: box.value.y,
        width: box.value.width,
        height: box.value.height,
      };
    },
    { immediate: true },
  );
  watch(isDrawing, () => (store.isDrawing = isDrawing.value), { immediate: true });
};
