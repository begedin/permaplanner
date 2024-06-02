import { useStorage } from '@vueuse/core';
import { watch } from 'vue';

import { useMapScaleStore } from './useMapScaleStore';

export const useMapScale = (camera: { x: number; y: number; scale: number }) => {
  const store = useMapScaleStore();
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

  const startMoveScaleStart = (e: MouseEvent) => {
    store.start.x = (e.offsetX + camera.x) / camera.scale;
    store.start.y = (e.offsetY + camera.y) / camera.scale;

    const { x, y } = store.start;

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

        store.start.x = x + dx;
        store.start.y = y + dy;
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
    store.end.x = (e.offsetX + camera.x) / camera.scale;
    store.end.y = (e.offsetY + camera.y) / camera.scale;

    const { x, y } = store.end;

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

        store.end.x = x + dx;
        store.end.y = y + dy;
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
  watch(
    () => store.linePhysicalLength,
    (l) => {
      if (l === 1) return;
      onboardingState.value = 'settingLength';
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        onboardingState.value = 'done';
      }, 1000);
    },
  );

  return {
    startMoveScaleEnd,
    startMoveScaleStart,
    onboardingState,
  };
};
