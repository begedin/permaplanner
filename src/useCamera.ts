import { ref, type Ref } from 'vue';
import { clientToSvgUser } from './svgClientToUser';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_SESSION_MS = 200;
const PAN_ZOOM_GRACE_MS = 200;
const MIN_WHEEL_ZOOM_DELTA = 2;

type CameraInteraction =
  | { kind: 'idle' }
  | { kind: 'zoomSession'; anchor: { x: number; y: number } }
  | { kind: 'panning'; controller: AbortController };

export const useCamera = (
  element: Ref<SVGElement | undefined>,
  dimensions: Ref<{
    containerWidth: number;
    containerHeight: number;
    worldWidth: number;
    worldHeight: number;
  }>,
) => {
  const camera = useCameraStore();
  const mouse = ref({ x: 0, y: 0 });

  const scene = useSceneStore();

  let interaction: CameraInteraction = { kind: 'idle' };
  let interactionTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelZoomCooldown: ReturnType<typeof setTimeout> | undefined;

  const clearInteractionTimer = () => {
    if (interactionTimer !== undefined) {
      clearTimeout(interactionTimer);
      interactionTimer = undefined;
    }
  };

  const clearWheelZoomCooldown = () => {
    if (wheelZoomCooldown !== undefined) {
      clearTimeout(wheelZoomCooldown);
      wheelZoomCooldown = undefined;
    }
  };

  const extendWheelZoomCooldown = () => {
    clearWheelZoomCooldown();
    wheelZoomCooldown = setTimeout(() => {
      wheelZoomCooldown = undefined;
    }, PAN_ZOOM_GRACE_MS);
  };

  const isWheelZoomBlocked = () =>
    interaction.kind === 'panning' || wheelZoomCooldown !== undefined;

  const resetInteraction = () => {
    if (interaction.kind === 'panning') {
      interaction.controller.abort();
    }
    clearInteractionTimer();
    clearWheelZoomCooldown();
    interaction = { kind: 'idle' };
  };

  const endZoomSession = () => {
    clearInteractionTimer();
    if (interaction.kind === 'zoomSession') {
      interaction = { kind: 'idle' };
    }
  };

  const beginOrExtendZoomSession = (point: { x: number; y: number }) => {
    if (interaction.kind !== 'zoomSession') {
      interaction = { kind: 'zoomSession', anchor: point };
    }
    clearInteractionTimer();
    interactionTimer = setTimeout(endZoomSession, ZOOM_SESSION_MS);
  };

  const startPan = (controller: AbortController) => {
    endZoomSession();
    if (interaction.kind === 'panning') {
      interaction.controller.abort();
    }
    interaction = { kind: 'panning', controller };
  };

  const zoomBy = (factor: number, anchor?: { x: number; y: number }) => {
    const { worldWidth, worldHeight } = dimensions.value;
    if (worldWidth <= 0 || worldHeight <= 0 || camera.width <= 0 || camera.height <= 0) {
      return;
    }

    const newZoom =
      factor > 0
        ? Math.min(camera.zoom + factor, MAX_ZOOM)
        : Math.max(camera.zoom + factor, MIN_ZOOM);

    if (newZoom === camera.zoom) {
      return;
    }

    const newWidth = worldWidth / newZoom;
    const newHeight = worldHeight / newZoom;

    const atX = anchor?.x ?? scene.worldX;
    const atY = anchor?.y ?? scene.worldY;
    const ratioX = (atX - camera.x) / camera.width;
    const ratioY = (atY - camera.y) / camera.height;

    camera.zoom = newZoom;
    camera.width = newWidth;
    camera.height = newHeight;
    camera.x = atX - ratioX * newWidth;
    camera.y = atY - ratioY * newHeight;
  };

  let teardownController = new AbortController();

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
        const wheelWouldZoom = Math.abs(e.deltaY) >= MIN_WHEEL_ZOOM_DELTA;

        if (isWheelZoomBlocked()) {
          e.preventDefault();
          if (wheelWouldZoom) {
            extendWheelZoomCooldown();
          }
          return;
        }

        if (!wheelWouldZoom) {
          return;
        }

        e.preventDefault();

        const svg = element.value;
        if (!(svg instanceof SVGSVGElement)) {
          return;
        }

        beginOrExtendZoomSession(clientToSvgUser(svg, e.clientX, e.clientY));
        if (interaction.kind !== 'zoomSession') {
          return;
        }
        zoomBy(e.deltaY < 0 ? 0.2 : -0.2, interaction.anchor);
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
    const svg = element.value;
    if (!(svg instanceof SVGSVGElement)) {
      return;
    }

    svg.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 1) {
          return;
        }

        e.preventDefault();

        const panPointerId = e.pointerId;
        const panController = new AbortController();
        startPan(panController);

        const panStart = {
          clientX: e.clientX,
          clientY: e.clientY,
          cameraX: camera.x,
          cameraY: camera.y,
          scale: camera.scale,
          zoom: camera.zoom,
        };

        const applyPan = (clientX: number, clientY: number) => {
          const screenToViewBox = panStart.scale * panStart.zoom;
          camera.x = panStart.cameraX - (clientX - panStart.clientX) / screenToViewBox;
          camera.y = panStart.cameraY - (clientY - panStart.clientY) / screenToViewBox;
        };

        const finishPan = (clientX: number, clientY: number) => {
          if (
            interaction.kind !== 'panning' ||
            interaction.controller !== panController
          ) {
            return;
          }
          applyPan(clientX, clientY);
          if (svg.hasPointerCapture(panPointerId)) {
            svg.releasePointerCapture(panPointerId);
          }
          panController.abort();
          interaction = { kind: 'idle' };
          extendWheelZoomCooldown();
        };

        svg.setPointerCapture(panPointerId);

        svg.addEventListener(
          'pointermove',
          (moveE) => {
            if (moveE.pointerId !== panPointerId) {
              return;
            }
            applyPan(moveE.clientX, moveE.clientY);
          },
          { signal: panController.signal },
        );

        svg.addEventListener(
          'pointerup',
          (upE) => {
            if (upE.pointerId !== panPointerId) {
              return;
            }
            finishPan(upE.clientX, upE.clientY);
          },
          { signal: panController.signal },
        );

        svg.addEventListener(
          'pointercancel',
          (cancelE) => {
            if (cancelE.pointerId !== panPointerId) {
              return;
            }
            finishPan(cancelE.clientX, cancelE.clientY);
          },
          { signal: panController.signal },
        );

        window.addEventListener('blur', () => finishPan(e.clientX, e.clientY), {
          signal: panController.signal,
        });
      },
      { signal: teardownController.signal },
    );
  };

  const fitToViewPort = () => {
    const { containerWidth, containerHeight, worldWidth, worldHeight } = dimensions.value;
    if (
      worldWidth <= 0 ||
      worldHeight <= 0 ||
      containerWidth <= 0 ||
      containerHeight <= 0
    ) {
      return;
    }

    endZoomSession();

    camera.zoom = 1;

    camera.width = worldWidth;
    camera.height = worldHeight;

    camera.x = 0;
    camera.y = 0;

    const scaleX = containerWidth / worldWidth;
    const scaleY = containerHeight / worldHeight;
    const scale = Math.min(scaleX, scaleY);
    camera.scale = scale;
  };

  const setupCamera = () => {
    resetInteraction();
    teardownController.abort();
    teardownController = new AbortController();
    setupWheelZoom();
    setupMousePositionTracking();
    setupKeyBindings();
    setupMiddleMousePan();
  };

  const teardownCamera = () => {
    resetInteraction();
    teardownController.abort();
  };

  return {
    camera,
    setupCamera,
    teardownCamera,
    fitToViewPort,
  };
};
