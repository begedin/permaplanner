<script lang="ts" setup>
  import { computed, onBeforeUnmount } from 'vue';
  import { storeToRefs } from 'pinia';
  import { advanceOnboardingState } from './onboardingTypes';
  import { useMapScaleStore } from './useMapScaleStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { usePlanCommandHistory } from './usePlanCommandHistory';
  import { useSceneStore } from './useSceneStore';

  const store = useMapScaleStore();
  const { onboardingState } = storeToRefs(usePermaplannerStore());
  const scene = useSceneStore();
  const commandHistory = usePlanCommandHistory();

  let activeDragAbort: AbortController | undefined;

  onBeforeUnmount(() => {
    activeDragAbort?.abort();
    activeDragAbort = undefined;
  });

  const dragMapScalePoint = (
    applyWorldPosition: (x: number, y: number) => void,
    onMouseMove?: () => void,
  ) => {
    activeDragAbort?.abort();
    const before = commandHistory.capturePlanSavableState();
    const controller = new AbortController();
    activeDragAbort = controller;

    applyWorldPosition(scene.worldX, scene.worldY);

    const finishDrag = () => {
      if (
        onboardingState.value === 'movingFirst' ||
        onboardingState.value === 'movingSecond'
      ) {
        onboardingState.value = advanceOnboardingState(onboardingState.value);
      }
      commandHistory.commitSnapshot(before);
      controller.abort();
      if (activeDragAbort === controller) {
        activeDragAbort = undefined;
      }
    };

    document.addEventListener(
      'mousemove',
      () => {
        applyWorldPosition(scene.worldX, scene.worldY);
        onMouseMove?.();
      },
      { signal: controller.signal },
    );

    document.addEventListener('mouseup', finishDrag, { signal: controller.signal });
  };

  const startMoveScaleStart = () => {
    dragMapScalePoint(
      (x, y) => {
        store.start.x = x;
        store.start.y = y;
      },
      () => {
        if (onboardingState.value === 'initial') {
          onboardingState.value = advanceOnboardingState(onboardingState.value);
        }
      },
    );
  };

  const startMoveScaleEnd = () => {
    dragMapScalePoint(
      (x, y) => {
        store.end.x = x;
        store.end.y = y;
      },
      () => {
        if (
          (store.end.x !== store.start.x || store.end.y !== store.start.y) &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond'
        ) {
          onboardingState.value = advanceOnboardingState(onboardingState.value);
        }
      },
    );
  };

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
