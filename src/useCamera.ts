import { ref, type Ref } from 'vue';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export const useCamera = (
  element: Ref<SVGElement | undefined>,
  dimensions: Ref<{
    containerWidth: number;
    containerHeight: number;
    backgroundNaturalWidth: number;
    backgroundNaturalHeight: number;
  }>,
) => {
  const camera = useCameraStore();
  const mouse = ref({ x: 0, y: 0 });

  const scene = useSceneStore();

  const zoomBy = (factor: number) => {
    const { backgroundNaturalWidth, backgroundNaturalHeight } = dimensions.value;

    const newZoom =
      factor > 0
        ? Math.min(camera.zoom + factor, MAX_ZOOM)
        : Math.max(camera.zoom + factor, MIN_ZOOM);

    const newWidth = backgroundNaturalWidth / newZoom;
    const newHeight = backgroundNaturalHeight / newZoom;

    const atX = scene.worldX;
    const atY = scene.worldY;

    camera.zoom = newZoom;
    camera.x = atX - newWidth / 2;
    camera.y = atY - newHeight / 2;
    camera.width = newWidth;
    camera.height = newHeight;
  };

  const teardownController = new AbortController();

  const setupMousePositionTracking = () => {
    element.value?.addEventListener(
      'mousemove',
      (event) => ((mouse.value.x = event.offsetX), (mouse.value.y = event.offsetY)),
      { signal: teardownController.signal },
    );
  };

  const setupWheelZoom = () => {
    element.value?.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 0.2 : -0.2);
      },
      { passive: false, signal: teardownController.signal },
    );
  };

  const setupKeyBindings = () => {
    document.addEventListener(
      'keypress',
      (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'A') camera.x += 10;
        if (e.key === 'ArrowRight' || e.key === 'D') camera.x -= 10;
        if (e.key === 'ArrowUp' || e.key === 'W') camera.y += 10;
        if (e.key === 'ArrowDown' || e.key === 'S') camera.y -= 10;

        if (e.key === '+') zoomBy(0.1);
        if (e.key === '-') zoomBy(-0.1);
      },
      { signal: teardownController.signal },
    );
  };

  const setupMiddleMousePan = () => {
    document.addEventListener(
      'mousedown',
      (e) => {
        const wheelPanController = new AbortController();

        if (e.button !== 1) {
          return;
        }

        e.preventDefault();

        document.addEventListener(
          'mousemove',
          (moveE) => {
            camera.x -= moveE.movementX / camera.scale;
            camera.y -= moveE.movementY / camera.scale;
          },
          { signal: wheelPanController.signal },
        );

        document.addEventListener('mouseup', () => wheelPanController.abort(), {
          signal: wheelPanController.signal,
        });
      },
      { signal: teardownController.signal },
    );
  };

  const fitToViewPort = () => {
    const {
      containerWidth,
      containerHeight,
      backgroundNaturalWidth,
      backgroundNaturalHeight,
    } = dimensions.value;

    camera.zoom = 1;

    camera.width = backgroundNaturalWidth;
    camera.height = backgroundNaturalHeight;

    camera.x = 0;
    camera.y = 0;

    const scaleX = containerWidth / backgroundNaturalWidth;
    const scaleY = containerHeight / backgroundNaturalHeight;
    const scale = Math.min(scaleX, scaleY);
    camera.scale = scale;
  };

  const setupCamera = () => {
    setupWheelZoom();
    setupMousePositionTracking();
    setupKeyBindings();
    setupMiddleMousePan();
  };

  const teardownCamera = () => teardownController.abort();

  return {
    camera,
    setupCamera,
    teardownCamera,
    fitToViewPort,
  };
};
