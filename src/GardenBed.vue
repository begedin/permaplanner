<script lang="ts" setup>
import { computed, onBeforeMount, onMounted, ref, watch } from 'vue';
import type { GardenBed } from './useGardenStore';
import GardenMeasure from './GardenMeasure.vue';

import paper, { Path, PathItem, Size } from 'paper/dist/paper-core';

onBeforeMount(() => paper.setup(new Size(1, 1)));

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
  path.value = props.bed.d === '' ? '' : new Path(props.bed.d).pathData;
};

onMounted(resetPath);

const path = ref<string>('');

watch(() => props.bed, resetPath);

const brushSize = ref(12);

const brush = computed(() => {
  return new Path.Circle({
    center: new paper.Point(props.mouseX, props.mouseY),
    radius: brushSize.value,
  })
    .toShape()
    .toPath().pathData;
});

let editModeController = new AbortController();

const stroke = ref<string>();

watch(
  () => props.selected,
  (selected) => {
    if (!selected) {
      editModeController.abort();
      return;
    }

    editModeController = new AbortController();

    document.addEventListener('mousedown', () => {
      let brushStroke: InstanceType<typeof PathItem> = new Path(brush.value);

      const controller = new AbortController();
      document.addEventListener(
        'mousemove',
        () => {
          brushStroke = brushStroke.unite(new Path(brush.value));
          stroke.value = brushStroke.pathData;
        },
        { signal: controller.signal },
      );
      document.addEventListener(
        'mouseup',
        () => {
          brushStroke.simplify();
          const paperPath = new Path(path.value).unite(brushStroke);

          path.value = paperPath.pathData;
          stroke.value = undefined;
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
          emit('update', { ...props.bed, d: path.value });
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
  if (!path.value) {
    return null;
  }
  const bedPath = new Path(path.value);
  const box = bedPath.bounds;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
});
</script>
<template>
  <path
    v-if="stroke"
    :d="stroke"
    fill="rgba(0, 0, 0, 0.1)"
    class="pointer-events-none"
  />
  <path
    v-if="path"
    ref="pathEl"
    :d="path"
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
