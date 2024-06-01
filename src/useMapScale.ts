import { useStorage } from '@vueuse/core';
import { computed, watch } from 'vue';

const DEFAULT_START = { x: 20, y: 20 };
const DEFAULT_END = { x: 150, y: 20 };

export const useMapScale = (camera: { x: number; y: number; scale: number }) => {
  const mapScaleStart = useStorage<{ x: number; y: number }>('mapScaleStart', DEFAULT_START);
  const mapScaleEnd = useStorage<{ x: number; y: number }>('mapScaleEnd', DEFAULT_END);

  const onboardingSteps = [
    'initial',
    'movingFirst',
    'movedFirst',
    'movingSecond',
    'movedSecond',
    'settingLength',
    'done',
  ] as const;

  const onboardingState = useStorage<
    | 'initial'
    | 'movingFirst'
    | 'movedFirst'
    | 'movingSecond'
    | 'movedSecond'
    | 'settingLength'
    | 'done'
  >('onboardingState', 'initial');

  const advanceOnboarding = () => {
    const currentIndex = onboardingSteps.indexOf(onboardingState.value);
    onboardingState.value = onboardingSteps[currentIndex + 1] || 'done';
  };

  const mapScaleReferenceLine = computed(() => {
    return {
      x1: mapScaleStart.value.x,
      y1: mapScaleStart.value.y,
      x2: mapScaleEnd.value.x,
      y2: mapScaleEnd.value.y,
    };
  });

  const mapScaleReferenceLineRealLength = useStorage<number>('mapScaleReferenceLineRealLength', 1);

  const mapScaleUnitLengthPx = computed(() => {
    const x1 = mapScaleStart.value.x;
    const y1 = mapScaleStart.value.y;
    const x2 = mapScaleEnd.value.x;
    const y2 = mapScaleEnd.value.y;

    const indicatorLengthPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    return indicatorLengthPx / mapScaleReferenceLineRealLength.value;
  });

  const startMoveScaleStart = (e: MouseEvent) => {
    mapScaleStart.value = {
      x: (e.offsetX + camera.x) / camera.scale,
      y: (e.offsetY + camera.y) / camera.scale,
    };

    const { x, y } = mapScaleStart.value;

    const startX = e.clientX;
    const startY = e.clientY;

    const controller = new AbortController();

    document.addEventListener(
      'mousemove',
      (moveE: MouseEvent) => {
        const dx = (moveE.clientX - startX) / camera.scale;
        const dy = (moveE.clientY - startY) / camera.scale;
        if (
          dx > 0 &&
          dy > 0 &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond'
        ) {
          advanceOnboarding();
        }

        mapScaleStart.value = { x: x + dx, y: y + dy };
      },
      { signal: controller.signal },
    );

    document.addEventListener(
      'mouseup',
      () => {
        if (onboardingState.value === 'movingFirst' || onboardingState.value === 'movingSecond') {
          advanceOnboarding();
        }
        controller.abort();
      },
      { once: true },
    );
  };

  const startMoveScaleEnd = (e: MouseEvent) => {
    mapScaleEnd.value = {
      x: (e.offsetX + camera.x) / camera.scale,
      y: (e.offsetY + camera.y) / camera.scale,
    };

    const { x, y } = mapScaleEnd.value;

    const startX = e.clientX;
    const startY = e.clientY;

    const controller = new AbortController();

    document.addEventListener(
      'mousemove',
      (moveE: MouseEvent) => {
        const dx = (moveE.clientX - startX) / camera.scale;
        const dy = (moveE.clientY - startY) / camera.scale;

        if (
          dx > 0 &&
          dy > 0 &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond'
        ) {
          advanceOnboarding();
        }

        mapScaleEnd.value = { x: x + dx, y: y + dy };
      },
      { signal: controller.signal },
    );

    document.addEventListener(
      'mouseup',
      () => {
        if (onboardingState.value === 'movingFirst' || onboardingState.value === 'movingSecond') {
          advanceOnboarding();
        }
        controller.abort();
      },
      { once: true },
    );
  };

  let timeout = 0;
  watch(mapScaleReferenceLineRealLength, (l) => {
    if (l === 1) return;
    onboardingState.value = 'settingLength';
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      onboardingState.value = 'done';
    }, 1000);
  });

  return {
    mapScaleEnd,
    mapScaleReferenceLine,
    mapScaleReferenceLineRealLength,
    mapScaleStart,
    mapScaleUnitLengthPx,
    startMoveScaleEnd,
    startMoveScaleStart,
    onboardingState,
  };
};
