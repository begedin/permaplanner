import { ref, type Ref } from 'vue';
import { useCameraStore } from './useCameraStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export const useCamera = (
  element: Ref<SVGElement | undefined>,
  dimensions: Ref<{
    viewportWidth: number;
    viewportHeight: number;
    contentWidth: number;
    contentHeight: number;
  }>,
) => {
  const camera = useCameraStore();
  const mouse = ref({ x: 0, y: 0 });

  const zoomBy = (factor: number) => {
    // this is the mouse cursor position in the unscaled image
    const originalPosition = {
      x: (camera.x + mouse.value.x) / camera.scale,
      y: (camera.y + mouse.value.y) / camera.scale,
    };

    const newScale =
      factor > 0
        ? Math.min(camera.scale + factor, MAX_ZOOM)
        : Math.max(camera.scale + factor, MIN_ZOOM);

    const newOffsetX = originalPosition.x * (newScale - 1) + (originalPosition.x - mouse.value.x);
    const newOffsetY = originalPosition.y * (newScale - 1) + (originalPosition.y - mouse.value.y);

    camera.scale = newScale;
    camera.x = newOffsetX;
    camera.y = newOffsetY;
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

        if (e.buttons !== 4) {
          return;
        }

        e.preventDefault();

        document.addEventListener(
          'mousemove',
          (moveE) => {
            camera.x -= moveE.movementX;
            camera.y -= moveE.movementY;
          },
          { signal: wheelPanController.signal },
        );

        document.addEventListener(
          'mouseup',
          () => {
            wheelPanController.abort();
          },
          { signal: wheelPanController.signal },
        );
      },
      { signal: teardownController.signal },
    );
  };

  const fitToViewPort = () => {
    const { viewportWidth, viewportHeight, contentWidth, contentHeight } = dimensions.value;
    const scale = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight);

    camera.x = -(viewportWidth - contentWidth * scale) / 2;
    camera.y = -(viewportHeight - contentHeight * scale) / 2;
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
