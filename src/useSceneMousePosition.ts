import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { useCameraStore } from './useCameraStore';
import { useSceneMousePositionStore } from './useSceneMousePositionStore';

export const useSceneMousePosition = (svgRef: Ref<SVGElement | undefined>) => {
  const camera = useCameraStore();
  const mouse = useSceneMousePositionStore();
  let controller = new AbortController();

  onMounted(() => {
    controller = new AbortController();
    svgRef.value?.addEventListener('mousemove', (e) => {
      mouse.x = e.offsetX + camera.x;
      mouse.y = e.offsetY + camera.y;
    });
  });

  onBeforeUnmount(() => {
    controller.abort();
  });
};
