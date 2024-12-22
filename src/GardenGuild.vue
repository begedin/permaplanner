<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import simplify from 'simplify-js';
import clipping from 'polygon-clipping';

import { type Guild } from './useGardenStore';
import GardenMeasure from './GardenMeasure.vue';
import { useSceneStore } from './useSceneStore';
import { useMagicKeys } from '@vueuse/core';

const props = defineProps<{
  unitLengthPx: number;
  guild: Guild;
  hovered: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', guild: Guild): void;
  (e: 'cancel' | 'click' | 'mouseenter' | 'mouseleave'): void;
  (e: 'click', evt: MouseEvent): void;
}>();

const resetPath = () => {
  path.value = props.guild.path;
};

const path = ref<{ x: number; y: number }[]>([]);

watch(() => props.guild, resetPath, { immediate: true });

const brushSize = ref(12);

const brush = computed(() => {
  if (!props.selected) {
    return [];
  }

  const x = Math.max(scene.cameraX, 0);
  const y = Math.max(scene.cameraY, 0);
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

const subtractPaths = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
  return a.length > 0
    ? clipping
        .difference(
          [a.map(({ x, y }) => [x, y] as [number, number])],
          [b.map(({ x, y }) => [x, y] as [number, number])],
        )
        .map((polygon) => polygon.map((path) => path.map(([x, y]) => ({ x, y }))))
        .flat()
        .flat()
    : a;
};

const scene = useSceneStore();
const { meta } = useMagicKeys();

watch(
  () => scene.isDrawing,
  (isDrawing) => {
    if (!props.selected) {
      return;
    }

    if (isDrawing) {
      stroke.value = simplify(joinPaths(stroke.value, brush.value));
      return;
    }

    if (!isDrawing) {
      path.value = simplify(
        meta.value ? subtractPaths(path.value, stroke.value) : joinPaths(path.value, stroke.value),
      );
      stroke.value = [];
      return;
    }
  },
);

watch(
  () => [scene.cameraX, scene.cameraY],
  () => {
    if (!props.selected) {
      return;
    }

    if (scene.isDrawing) {
      stroke.value = simplify(joinPaths(stroke.value, brush.value));
    }
  },
);

watch(
  () => props.selected,
  (selected) => {
    if (!selected) {
      editModeController.abort();
      return;
    }

    editModeController = new AbortController();

    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          editModeController.abort();
          emit('update', { ...props.guild, path: path.value });
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          editModeController.abort();
          resetPath();
          emit('cancel');
        }

        if (e.key === '+') {
          e.preventDefault();
          Math.min((brushSize.value += 1), 50);
        }

        if (e.key === '-') {
          e.preventDefault();
          Math.max((brushSize.value -= 1), 1);
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
    v-else-if="selected || hovered"
    :points="brush.map(({ x, y }) => `${x},${y}`).join(' ')"
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
    @mouseenter.="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
    @click="emit('click', $event)"
  />
  <GardenMeasure
    v-if="box && (hovered || selected)"
    :unit-length-px="unitLengthPx"
    :box="box"
  />

  <slot name="features" />
</template>
