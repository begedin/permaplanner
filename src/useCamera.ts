import { isEditableTarget, useMapShortcutGuard } from './keyboardShortcuts';
import { shallowRef, type Ref } from 'vue';
import { useTimeout, useTimeoutFn } from '@vueuse/core';
import { clientToSvgUser } from './svgClientToUser';
import {
  useCameraViewport,
  type CameraDimensions,
  type CameraFocus,
} from './useCameraViewport';
export type { CameraFocus } from './useCameraViewport';

const ZOOM_SESSION_MS = 200;
const PAN_ZOOM_GRACE_MS = 200;

type Point = { x: number; y: number };
type Finger = Point & { id: number };
type Pan = {
  kind: 'panning';
  pointerId: number;
  touch: boolean;
  last: Point;
  dragging: boolean;
};
type CameraInteraction =
  | { kind: 'idle' }
  | { kind: 'zoomSession'; anchor: Point }
  | Pan
  | { kind: 'touchContact'; finger: Finger }
  | {
      kind: 'touchPinch';
      fingers: [Finger, Finger];
      distance: number;
      zoom: number;
      anchor: Point;
    }
  | { kind: 'pinching'; zoom: number; anchor: Point };

export const useCamera = (
  element: Ref<SVGElement | undefined>,
  dimensions: Ref<CameraDimensions>,
  canPanWithTouch = () => true,
  focus: Readonly<Ref<CameraFocus | undefined>> = shallowRef(),
) => {
  const mapInputBlocked = useMapShortcutGuard();
  let mouse: Point = { x: 0, y: 0 };
  let interaction: CameraInteraction = { kind: 'idle' };
  const endZoomSession = () => {
    if (interaction.kind === 'zoomSession') interaction = { kind: 'idle' };
  };
  const zoomSessionTimeout = useTimeoutFn(endZoomSession, ZOOM_SESSION_MS, {
    immediate: false,
  });
  const wheelZoomCooldown = useTimeout(PAN_ZOOM_GRACE_MS, {
    controls: true,
    immediate: false,
  });
  const isWheelZoomBlocked = () =>
    (interaction.kind === 'panning' && !interaction.touch) ||
    wheelZoomCooldown.isPending.value;

  const resetInteraction = () => {
    const previous = interaction;
    interaction = { kind: 'idle' };
    const release = (id: number) => {
      if (element.value?.hasPointerCapture(id)) element.value.releasePointerCapture(id);
    };
    if (previous.kind === 'touchPinch') {
      for (const finger of previous.fingers) release(finger.id);
    } else if (previous.kind === 'panning') release(previous.pointerId);
    zoomSessionTimeout.stop();
    wheelZoomCooldown.stop();
  };

  const { camera, panTo, zoomAt } = useCameraViewport(
    dimensions,
    focus,
    resetInteraction,
  );

  let teardownController = new AbortController();

  const setupGestures = () => {
    const svg = element.value;
    if (!(svg instanceof SVGSVGElement)) return;

    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (interaction.kind === 'panning' || (e.ctrlKey && isWheelZoomBlocked())) {
          if (e.deltaX !== 0 || e.deltaY !== 0) wheelZoomCooldown.start();
          return;
        }
        if (interaction.kind === 'pinching' || interaction.kind === 'touchPinch') return;

        const unit = e.deltaMode === 1 ? 16 : 1;
        const unitX = e.deltaMode === 2 ? dimensions.value.containerWidth : unit;
        const unitY = e.deltaMode === 2 ? dimensions.value.containerHeight : unit;
        if (!e.ctrlKey) {
          zoomSessionTimeout.stop();
          endZoomSession();
          const from = clientToSvgUser(svg, e.clientX, e.clientY);
          const to = clientToSvgUser(
            svg,
            e.clientX + e.deltaX * unitX,
            e.clientY + e.deltaY * unitY,
          );
          panTo(camera.x + (to.x - from.x), camera.y + (to.y - from.y));
          return;
        }

        if (e.deltaY === 0) return;
        if (interaction.kind !== 'zoomSession') {
          interaction = {
            kind: 'zoomSession',
            anchor: clientToSvgUser(svg, e.clientX, e.clientY),
          };
        }
        zoomSessionTimeout.start();
        zoomAt(camera.zoom * Math.exp(-e.deltaY * unitY * 0.01), interaction.anchor);
      },
      { passive: false, signal: teardownController.signal },
    );

    // Safari exposes native pinch gestures separately from wheel events.
    svg.addEventListener(
      'gesturestart',
      (event) => {
        event.preventDefault();
        if (isWheelZoomBlocked() || interaction.kind === 'touchPinch') return;
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
        zoomAt(interaction.zoom * e.scale, interaction.anchor);
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
        if (isEditableTarget(e.target) || mapInputBlocked(e.target)) return;
        if (e.key === 'ArrowLeft' || e.key === 'A') panTo(camera.x + 10, camera.y);
        if (e.key === 'ArrowRight' || e.key === 'D') panTo(camera.x - 10, camera.y);
        if (e.key === 'ArrowUp' || e.key === 'W') panTo(camera.x, camera.y + 10);
        if (e.key === 'ArrowDown' || e.key === 'S') panTo(camera.x, camera.y - 10);

        if (e.key === '+') zoomAt(camera.zoom + 0.1, mouse);
        if (e.key === '-') zoomAt(camera.zoom - 0.1, mouse);
      },
      { signal: teardownController.signal },
    );
  };

  const setupPointerPan = () => {
    const svg = element.value;
    if (!(svg instanceof SVGSVGElement)) {
      return;
    }

    const options = { signal: teardownController.signal };
    const applyPan = (pan: Pan, e: PointerEvent) => {
      const dx = e.clientX - pan.last.x;
      const dy = e.clientY - pan.last.y;
      if (!pan.dragging) {
        if (Math.hypot(dx, dy) < 6) return;
        pan.dragging = true;
        svg.setPointerCapture(e.pointerId);
      }
      panTo(camera.x - camera.cameraToWorld(dx), camera.y - camera.cameraToWorld(dy));
      pan.last = { x: e.clientX, y: e.clientY };
    };

    // Observe the first contact even when a feature takes its single-finger drag.
    svg.addEventListener(
      'pointerdown',
      (e) => {
        if (
          e.pointerType !== 'touch' ||
          !canPanWithTouch() ||
          interaction.kind === 'pinching'
        )
          return;
        if (e.isPrimary) {
          resetInteraction();
          interaction = {
            kind: 'touchContact',
            finger: { x: e.clientX, y: e.clientY, id: e.pointerId },
          };
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        let first: Finger;
        if (interaction.kind === 'touchContact') first = interaction.finger;
        else if (interaction.kind === 'panning' && interaction.touch)
          first = { ...interaction.last, id: interaction.pointerId };
        else return;
        const second = { x: e.clientX, y: e.clientY, id: e.pointerId };
        const fingers: [Finger, Finger] = [first, second];
        interaction = {
          kind: 'touchPinch',
          fingers,
          zoom: camera.zoom,
          distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
          anchor: clientToSvgUser(
            svg,
            (first.x + second.x) / 2,
            (first.y + second.y) / 2,
          ),
        };
        for (const finger of fingers) svg.setPointerCapture(finger.id);
      },
      { ...options, capture: true },
    );

    svg.addEventListener(
      'pointerdown',
      (e) => {
        const touch =
          interaction.kind === 'touchContact' && interaction.finger.id === e.pointerId;
        if (e.defaultPrevented || (!touch && e.button !== 1)) return;
        if (!touch) resetInteraction();
        interaction = {
          kind: 'panning',
          pointerId: e.pointerId,
          touch,
          dragging: !touch,
          last: { x: e.clientX, y: e.clientY },
        };
        if (!touch) {
          e.preventDefault();
          svg.setPointerCapture(e.pointerId);
        }
      },
      options,
    );

    svg.addEventListener(
      'pointermove',
      (e) => {
        mouse = clientToSvgUser(svg, e.clientX, e.clientY);
        if (
          interaction.kind === 'touchContact' &&
          interaction.finger.id === e.pointerId
        ) {
          interaction.finger.x = e.clientX;
          interaction.finger.y = e.clientY;
        } else if (
          interaction.kind === 'panning' &&
          e.pointerId === interaction.pointerId
        ) {
          applyPan(interaction, e);
        } else if (interaction.kind === 'touchPinch') {
          const finger = interaction.fingers.find((finger) => finger.id === e.pointerId);
          if (!finger) return;
          finger.x = e.clientX;
          finger.y = e.clientY;
          const [a, b] = interaction.fingers;
          const distance = Math.hypot(b.x - a.x, b.y - a.y);
          const rect = svg.getBoundingClientRect();
          zoomAt(
            (interaction.zoom * distance) / interaction.distance,
            interaction.anchor,
            {
              x: (a.x + b.x) / 2 - rect.left,
              y: (a.y + b.y) / 2 - rect.top,
            },
          );
        }
      },
      options,
    );

    const endPointer = (e: PointerEvent) => {
      if (interaction.kind === 'touchContact' && interaction.finger.id === e.pointerId) {
        resetInteraction();
      } else if (interaction.kind === 'touchPinch') {
        const [a, b] = interaction.fingers;
        if (a.id !== e.pointerId && b.id !== e.pointerId) return;
        const last = a.id === e.pointerId ? b : a;
        interaction = {
          kind: 'panning',
          pointerId: last.id,
          last,
          dragging: true,
          touch: true,
        };
      } else if (
        interaction.kind === 'panning' &&
        e.pointerId === interaction.pointerId
      ) {
        const pan = interaction;
        if (e.type === 'pointerup') applyPan(pan, e);
        resetInteraction();
        if (!pan.touch && e.type === 'pointerup') wheelZoomCooldown.start();
      }
    };
    svg.addEventListener('pointerup', endPointer, options);
    svg.addEventListener('pointercancel', endPointer, options);
  };

  const teardownCamera = () => {
    resetInteraction();
    teardownController.abort();
  };
  const setupCamera = () => {
    teardownCamera();
    teardownController = new AbortController();
    setupGestures();
    setupKeyBindings();
    setupPointerPan();
  };

  return {
    camera,
    setupCamera,
    teardownCamera,
  };
};
