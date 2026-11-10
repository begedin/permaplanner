<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { onboardingDuringScaleDrag } from './onboardingTypes';
  import { usePointerSession } from './usePointerSession';
  import { clientToSvgUser } from './svgClientToUser';

  const store = useMapScaleStore();
  const gardenSession = useGardenSessionStore();
  const permaplanner = usePermaplannerStore();
  const draft = ref<{ endpoint: 'start' | 'end'; point: { x: number; y: number } }>();
  const session = usePointerSession();
  watch(() => [store.start, store.end, gardenSession.gardenId], session.cancel, {
    flush: 'sync',
  });

  const startDrag = (event: PointerEvent, endpoint: 'start' | 'end') => {
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    session.start(event, {
      update: (next) => {
        draft.value = {
          endpoint,
          point: clientToSvgUser(svg, next.clientX, next.clientY),
        };
      },
      cancel: () => {
        draft.value = undefined;
      },
      commit: () => {
        const point = draft.value?.point;
        draft.value = undefined;
        if (point) store.movePoint(endpoint, point);
      },
    });
  };

  const displayedOnboarding = computed(() =>
    draft.value
      ? onboardingDuringScaleDrag(permaplanner.onboardingState)
      : permaplanner.onboardingState,
  );

  const line = computed(() => {
    const start = draft.value?.endpoint === 'start' ? draft.value.point : store.start;
    const end = draft.value?.endpoint === 'end' ? draft.value.point : store.end;
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  });
  const centroid = computed(() => ({
    x: (line.value.x1 + line.value.x2) / 2,
    y: (line.value.y1 + line.value.y2) / 2,
  }));
</script>
<template>
  <line
    stroke="red"
    :x1="line.x1"
    :x2="line.x2"
    :y1="line.y1"
    :y2="line.y2"
  />

  <circle
    :cx="line.x1"
    :cy="line.y1"
    r="5"
    class="hover:[r:8]"
    fill="red"
    data-ref-line-start
    @mousedown.stop
    @pointerdown="startDrag($event, 'start')"
  />

  <circle
    :cx="line.x2"
    :cy="line.y2"
    r="5"
    class="hover:[r:8]"
    fill="red"
    data-ref-line-end
    @mousedown.stop
    @pointerdown="startDrag($event, 'end')"
  />

  <text
    :x="centroid.x"
    :y="centroid.y"
    fill="red"
  >
    {{ store.linePhysicalLength }} {{ store.unitLabel }}
  </text>
  <slot :onboarding-state="displayedOnboarding" />
</template>
