import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { useMediaQuery } from '@vueuse/core';

export type MapViewBounds = { x: number; y: number; width: number; height: number };

export const useMapViewTransition = (
  target: Ref<MapViewBounds>,
  view: Ref<string | undefined>,
) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const bounds = shallowRef(target.value);
  const transitioning = shallowRef(false);
  let frame: number | undefined;
  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    transitioning.value = false;
  };

  watch([target, view, reducedMotion], ([to, mode, reduce], [, previousMode]) => {
    const animate = !reduce && (mode !== previousMode || transitioning.value);
    stop();
    if (
      !animate ||
      to.width <= 0 ||
      to.height <= 0 ||
      bounds.value.width <= 0 ||
      bounds.value.height <= 0
    ) {
      bounds.value = to;
      return;
    }
    const from = bounds.value;
    const start = performance.now();
    transitioning.value = true;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 480);
      const eased = progress * progress * (3 - 2 * progress);
      const width = from.width * (to.width / from.width) ** eased;
      const height = from.height * (to.height / from.height) ** eased;
      const cx = (from.x + from.width / 2) * (1 - eased) + (to.x + to.width / 2) * eased;
      const cy =
        (from.y + from.height / 2) * (1 - eased) + (to.y + to.height / 2) * eased;
      bounds.value = { x: cx - width / 2, y: cy - height / 2, width, height };
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        bounds.value = to;
        stop();
      }
    };
    frame = requestAnimationFrame(tick);
  });
  onScopeDispose(stop);
  return { bounds, transitioning };
};
