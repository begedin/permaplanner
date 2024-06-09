import { useStorage } from '@vueuse/core';
import { watch } from 'vue';

import { useMapScaleStore } from './useMapScaleStore';
import { useSceneStore } from './useSceneStore';
import { useCameraStore } from './useCameraStore';

export const useMapScale = () => {
  const store = useMapScaleStore();
  const scene = useSceneStore();
  const camera = useCameraStore();
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

  const startMoveScaleStart = () => {
    store.start.x = (scene.x + camera.x) / camera.scale;
    store.start.y = (scene.y + camera.y) / camera.scale;

    const controller = new AbortController();

    document.addEventListener(
      'mousemove',
      () => {
        store.start.x = (scene.x + camera.x) / camera.scale;
        store.start.y = (scene.y + camera.y) / camera.scale;
        if (onboardingState.value === 'initial') {
          advanceOnboarding();
        }
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

  const startMoveScaleEnd = () => {
    store.end.x = (scene.x + camera.x) / camera.scale;
    store.end.y = (scene.y + camera.y) / camera.scale;

    const controller = new AbortController();

    document.addEventListener(
      'mousemove',
      () => {
        store.end.x = (scene.x + camera.x) / camera.scale;
        store.end.y = (scene.y + camera.y) / camera.scale;

        if (
          (store.end.x !== store.start.x || store.end.y !== store.start.y) &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond'
        ) {
          advanceOnboarding();
        }
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
