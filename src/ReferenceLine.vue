<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useMapScaleStore } from './useMapScaleStore';
import { useOnboardingStore } from './useOnboardingStore';
import { useSceneStore } from './useSceneStore';

const store = useMapScaleStore();
const onboarding = useOnboardingStore();
const scene = useSceneStore();

const startMoveScaleStart = () => {
  store.start.x = scene.worldX;
  store.start.y = scene.worldY;

  const controller = new AbortController();

  document.addEventListener(
    'mousemove',
    () => {
      store.start.x = scene.worldX;
      store.start.y = scene.worldY;
      if (onboarding.onboardingState === 'initial') {
        onboarding.advanceOnboarding();
      }
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    'mouseup',
    () => {
      if (
        onboarding.onboardingState === 'movingFirst' ||
        onboarding.onboardingState === 'movingSecond'
      ) {
        onboarding.advanceOnboarding();
      }
      controller.abort();
    },
    { signal: controller.signal },
  );
};

const startMoveScaleEnd = () => {
  store.end.x = scene.worldX;
  store.end.y = scene.worldY;

  const controller = new AbortController();

  document.addEventListener(
    'mousemove',
    () => {
      store.end.x = scene.worldX;
      store.end.y = scene.worldY;

      if (
        (store.end.x !== store.start.x || store.end.y !== store.start.y) &&
        onboarding.onboardingState !== 'movingFirst' &&
        onboarding.onboardingState !== 'movingSecond'
      ) {
        onboarding.advanceOnboarding();
      }
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    'mouseup',
    () => {
      if (
        onboarding.onboardingState === 'movingFirst' ||
        onboarding.onboardingState === 'movingSecond'
      ) {
        onboarding.advanceOnboarding();
      }
      controller.abort();
    },
    { signal: controller.signal },
  );
};

let timeout = 0;

watch(
  () => store.linePhysicalLength,
  (l) => {
    if (l === 1) return;
    onboarding.onboardingState = 'settingLength';
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      onboarding.onboardingState = 'done';
    }, 1000);
  },
);

const centroid = computed(() => {
  const { x1, y1, x2, y2 } = store.line;
  const x = Math.abs((x1 + x2) / 2);
  const y = Math.abs((y1 + y2) / 2);

  return { x, y };
});
</script>
<template>
  <line
    stroke="red"
    :x1="store.line.x1"
    :x2="store.line.x2"
    :y1="store.line.y1"
    :y2="store.line.y2"
  />

  <circle
    v-if="store.line"
    :cx="store.line.x1"
    :cy="store.line.y1"
    r="5"
    class="hover:[r:8]"
    fill="red"
    data-ref-line-start
    @mousedown.stop="startMoveScaleStart"
  />

  <circle
    :cx="store.line.x2"
    :cy="store.line.y2"
    r="5"
    class="hover:[r:8]"
    fill="red"
    data-ref-line-end
    @mousedown.stop="startMoveScaleEnd"
  />

  <text
    v-if="centroid"
    :x="centroid.x"
    :y="centroid.y"
    fill="red"
  >
    {{ store.linePhysicalLength }}
  </text>
</template>
