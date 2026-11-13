import { isEditableTarget } from './keyboardShortcuts';
import { ref, type Ref } from 'vue';
import { clientToSvgUser } from './svgClientToUser';
import { MAX_ZOOM, useCameraStore } from './useCameraStore';

const MIN_ZOOM = 0.1;
const ZOOM_SESSION_MS = 200;
const PAN_ZOOM_GRACE_MS = 200;

type CameraInteraction =
  | { kind: 'idle' }
  | { kind: 'zoomSession'; anchor: { x: number; y: number } }
  | { kind: 'panning'; controller: AbortController; pointerId: number }
  | { kind: 'pinching'; zoom: number; anchor: { x: number; y: number } };

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
      if (element.value?.hasPointerCapture(interaction.pointerId)) {
        element.value.releasePointerCapture(interaction.pointerId);
      }
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

  const zoomTo = (value: number, anchor?: { x: number; y: number }) => {
    const { worldWidth, worldHeight } = dimensions.value;
    if (worldWidth <= 0 || worldHeight <= 0 || camera.width <= 0 || camera.height <= 0) {
      return;
    }

    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

    if (newZoom === camera.zoom) {
      return;
    }

    const newWidth = worldWidth / newZoom;
    const newHeight = worldHeight / newZoom;

    const atX = anchor?.x ?? mouse.value.x;
    const atY = anchor?.y ?? mouse.value.y;
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
      'pointermove',
      (event) => {
        if (element.value instanceof SVGSVGElement)
          mouse.value = clientToSvgUser(element.value, event.clientX, event.clientY);
      },
      { signal: teardownController.signal },
    );
  };

  const setupGestures = () => {
    const svg = element.value;
    if (!(svg instanceof SVGSVGElement)) return;

    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (interaction.kind === 'panning' || (e.ctrlKey && isWheelZoomBlocked())) {
          if (e.deltaX !== 0 || e.deltaY !== 0) extendWheelZoomCooldown();
          return;
        }
        if (interaction.kind === 'pinching') return;

        const unitX =
          e.deltaMode === 1
            ? 16
            : e.deltaMode === 2
              ? dimensions.value.containerWidth
              : 1;
        const unitY =
          e.deltaMode === 1
            ? 16
            : e.deltaMode === 2
              ? dimensions.value.containerHeight
              : 1;
        if (!e.ctrlKey) {
          endZoomSession();
          const from = clientToSvgUser(svg, e.clientX, e.clientY);
          const to = clientToSvgUser(
            svg,
            e.clientX + e.deltaX * unitX,
            e.clientY + e.deltaY * unitY,
          );
          camera.x += to.x - from.x;
          camera.y += to.y - from.y;
          return;
        }

        if (e.deltaY === 0) return;
        beginOrExtendZoomSession(clientToSvgUser(svg, e.clientX, e.clientY));
        if (interaction.kind !== 'zoomSession') return;
        zoomTo(camera.zoom * Math.exp(-e.deltaY * unitY * 0.01), interaction.anchor);
      },
      { passive: false, signal: teardownController.signal },
    );

    // Safari exposes native pinch gestures separately from wheel events.
    svg.addEventListener(
      'gesturestart',
      (event) => {
        event.preventDefault();
        if (isWheelZoomBlocked()) return;
        const e = event as Event & { clientX: number; clientY: number };
        resetInteraction();
        interaction = {
          kind: 'pinching',
          zoom: camera.zoom,
          anchor: clientToSvgUser(svg, e.clientX, e.clientY),
        };
      },
      { passive: false, signal: teardownController.signal },
    );
    svg.addEventListener(
      'gesturechange',
      (event) => {
        event.preventDefault();
        const e = event as Event & { scale: number };
        if (interaction.kind !== 'pinching' || !Number.isFinite(e.scale) || e.scale <= 0)
          return;
        zoomTo(interaction.zoom * e.scale, interaction.anchor);
      },
      { passive: false, signal: teardownController.signal },
    );
    svg.addEventListener(
      'gestureend',
      (event) => {
        event.preventDefault();
        if (interaction.kind === 'pinching') resetInteraction();
      },
      { passive: false, signal: teardownController.signal },
    );
    window.addEventListener('blur', resetInteraction, {
      signal: teardownController.signal,
    });
  };

  const setupKeyBindings = () => {
    document.addEventListener(
      'keypress',
      (e) => {
        if (isEditableTarget(e.target)) return;
        if (e.key === 'ArrowLeft' || e.key === 'A') camera.x += 10;
        if (e.key === 'ArrowRight' || e.key === 'D') camera.x -= 10;
        if (e.key === 'ArrowUp' || e.key === 'W') camera.y += 10;
        if (e.key === 'ArrowDown' || e.key === 'S') camera.y -= 10;

        if (e.key === '+') zoomTo(camera.zoom + 0.1);
        if (e.key === '-') zoomTo(camera.zoom - 0.1);
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
        resetInteraction();
        interaction = {
          kind: 'panning',
          controller: panController,
          pointerId: panPointerId,
        };

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
          resetInteraction();
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

    resetInteraction();

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
    setupGestures();
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
