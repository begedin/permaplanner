import { watch, type Ref } from 'vue';
import { useSceneStore } from './useSceneStore';
import { useDrawBox } from './useDrawBox';
import { useCameraStore } from './useCameraStore';

export const useScene = (
  svgElement: Ref<SVGElement | undefined>,
  svgBGImageElement: Ref<SVGImageElement | undefined>,
) => {
  const { x, y, box, isDrawing } = useDrawBox(svgElement, svgBGImageElement);
  const store = useSceneStore();
  const camera = useCameraStore();

  watch(
    x,
    (value) => {
      store.x = value;
      store.worldX = camera.cameraToWorld(value);
    },
    { immediate: true },
  );
  watch(
    y,
    (value) => {
      store.y = value;
      store.worldY = camera.cameraToWorld(value);
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
        x: camera.cameraToWorld(box.value.x),
        y: camera.cameraToWorld(box.value.y),
        width: camera.cameraToWorld(box.value.width),
        height: camera.cameraToWorld(box.value.height),
      };
    },
    { immediate: true },
  );
  watch(isDrawing, () => (store.isDrawing = isDrawing.value), { immediate: true });
};
