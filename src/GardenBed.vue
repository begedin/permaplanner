<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import type { GardenBed } from './useGardenStore';
import GardenMeasure from './GardenMeasure.vue';

import simplify from 'simplify-js';
import clipping from 'polygon-clipping';

const props = defineProps<{
  mouseX: number;
  mouseY: number;
  unitLengthPx: number;
  bed: GardenBed;
  hovered: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', bed: GardenBed): void;
  (e: 'cancel' | 'click' | 'mouseenter' | 'mouseleave'): void;
  (e: 'click', evt: MouseEvent): void;
}>();

const resetPath = () => {
  path.value = props.bed.path;
};

onMounted(resetPath);

const path = ref<{ x: number; y: number }[]>([]);

watch(() => props.bed, resetPath);

const brushSize = ref(12);

const brush = computed(() => {
  const x = props.mouseX;
  const y = props.mouseY;
  const totalPoints = 20;
  const theta = (Math.PI * 2) / totalPoints;
  const points: { x: number; y: number }[] = [];
  const r = brushSize.value;
  for (let i = 0; i < totalPoints; i++) {
    const angle = theta * i;
    points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
  }

  return points;
});

let editModeController = new AbortController();

const stroke = ref<{ x: number; y: number }[]>([]);

const joinPaths = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
  return a.length > 0
    ? clipping
        .union(
          [a.map(({ x, y }) => [x, y] as [number, number])],
          [b.map(({ x, y }) => [x, y] as [number, number])],
        )
        .map((polygon) => polygon.map((path) => path.map(([x, y]) => ({ x, y }))))
        .flat()
        .flat()
    : b;
};

watch(
  () => props.selected,
  (selected) => {
    if (!selected) {
      editModeController.abort();
      return;
    }

    editModeController = new AbortController();

    document.addEventListener('mousedown', () => {
      stroke.value = [];

      const controller = new AbortController();
      document.addEventListener(
        'mousemove',
        () => {
          stroke.value = simplify(joinPaths(stroke.value, brush.value));
        },
        { signal: controller.signal },
      );
      document.addEventListener(
        'mouseup',
        () => {
          path.value = simplify(joinPaths(path.value, stroke.value));
          stroke.value = [];
          controller.abort();
        },
        { signal: controller.signal },
      );
    });

    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          editModeController.abort();
          console.log('emitting');
          emit('update', { ...props.bed, path: path.value });
        }

        if (e.key === 'Escape') {
          editModeController.abort();
          resetPath();
          emit('cancel');
        }
      },
      { signal: editModeController.signal },
    );
  },
  { immediate: true },
);

const box = computed(() => {
  if (path.value.length === 0) {
    return null;
  }
  const minX = Math.min(...path.value.map(({ x }) => x));
  const minY = Math.min(...path.value.map(({ y }) => y));
  const maxX = Math.max(...path.value.map(({ x }) => x));
  const maxY = Math.max(...path.value.map(({ y }) => y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
});
</script>
<template>
  <polygon
    v-if="stroke.length > 0"
    :points="stroke.map(({ x, y }) => `${x},${y}`).join(' ')"
    fill="rgba(0, 0, 0, 0.1)"
    class="pointer-events-none"
  />

  <polygon
    v-if="path"
    ref="pathEl"
    :points="path.map(({ x, y }) => `${x},${y}`).join(' ')"
    :fill="
      selected ? 'rgba(0, 100, 0, 0.6)' : hovered ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 100, 0, 0.2)'
    "
    class="pointer-events-fill"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
    @click="emit('click', $event)"
  />
  <GardenMeasure
    v-if="box && (hovered || selected)"
    :unit-length-px="unitLengthPx"
    :box="box"
  />
</template>
