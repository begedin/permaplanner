<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref, watch } from 'vue';
  import { useMapScaleStore } from './useMapScaleStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { onboardingDuringScaleDrag } from './onboardingTypes';
  import { clientToSvgUser } from './svgClientToUser';

  const store = useMapScaleStore();
  const permaplanner = usePermaplannerStore();
  const draft = ref<{ endpoint: 'start' | 'end'; point: { x: number; y: number } }>();
  let controller: AbortController | undefined;

  const cancelDrag = () => {
    controller?.abort();
    controller = undefined;
    draft.value = undefined;
  };
  onBeforeUnmount(cancelDrag);
  watch(() => [store.start, store.end, permaplanner.gardenId], cancelDrag, {
    flush: 'sync',
  });

  const startDrag = (event: MouseEvent, endpoint: 'start' | 'end') => {
    if (event.button !== 0) return;
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    cancelDrag();
    controller = new AbortController();
    const update = (event: MouseEvent) => {
      draft.value = {
        endpoint,
        point: clientToSvgUser(svg, event.clientX, event.clientY),
      };
    };
    const finish = (event: MouseEvent) => {
      const point = clientToSvgUser(svg, event.clientX, event.clientY);
      cancelDrag();
      store.movePoint(endpoint, point);
    };
    update(event);
    document.addEventListener(
      'mousemove',
      (event) => {
        if ((event.buttons & 1) === 0) finish(event);
        else update(event);
      },
      { signal: controller.signal },
    );
    document.addEventListener('mouseup', finish, { signal: controller.signal });
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') cancelDrag();
      },
      { signal: controller.signal },
    );
    window.addEventListener('blur', cancelDrag, { signal: controller.signal });
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
    @mousedown.stop="startDrag($event, 'start')"
  />

  <circle
    :cx="line.x2"
    :cy="line.y2"
    r="5"
    class="hover:[r:8]"
    fill="red"
    data-ref-line-end
    @mousedown.stop="startDrag($event, 'end')"
  />

  <text
    :x="centroid.x"
    :y="centroid.y"
    fill="red"
  >
    {{ store.linePhysicalLength }}
  </text>
  <slot :onboarding-state="displayedOnboarding" />
</template>
