<script setup lang="ts">
  import { computed } from 'vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';
  import type { MapShape } from './gardenDocument';
  import { useMapScaleStore } from './useMapScaleStore';
  const props = defineProps<{ shape: MapShape; feature: ShapeFeature }>();
  const appearance = computed(() => SHAPE_FEATURES[props.feature]);
  const emit = defineEmits<{ update: [shape: MapShape]; remove: []; done: [] }>();
  const scale = useMapScaleStore();
  const update = (field: 'name' | 'rotation', event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'rotation') {
      if (!Number.isFinite(Number(value))) return;
      emit('update', {
        ...props.shape,
        rotation: ((Number(value) % 360) + 360) % 360,
      });
    } else
      emit('update', { ...props.shape, name: value.trim() || appearance.value.label });
  };
</script>
<template>
  <div
    role="group"
    :aria-label="`${appearance.label} details`"
    class="paper-floating pointer-events-auto flex w-64 max-w-full min-h-0 overflow-y-auto flex-col gap-4 p-4 text-sm"
  >
    <div class="flex items-center gap-2 border-b border-parchment-300 pb-3">
      <UiIcon
        :name="appearance.icon"
        class="size-6 text-sage-800"
        aria-hidden="true"
      />
      <h2 class="text-lg font-medium">{{ appearance.label }}</h2>
    </div>
    <label class="paper-field-label"
      >{{ appearance.label }} name
      <input
        class="input-soft w-full px-3 py-2 font-normal text-ink-800"
        :value="props.shape.name"
        @change="update('name', $event)"
      />
    </label>
    <label class="paper-field-label"
      >Rotation (degrees)
      <input
        type="number"
        class="input-soft w-full px-3 py-2 font-normal text-ink-800"
        :value="Math.round(props.shape.rotation)"
        @change="update('rotation', $event)"
      />
    </label>
    <p
      v-if="scale.unitLengthPx > 0"
      class="paper-inset rounded-lg border border-parchment-300/70 px-3 py-2 text-center font-medium tabular-nums text-ink-700"
    >
      {{ (props.shape.width / scale.unitLengthPx).toFixed(2) }} ×
      {{ (props.shape.height / scale.unitLengthPx).toFixed(2) }} {{ scale.unitLabel }}
    </p>
    <p class="text-xs leading-relaxed text-ink-600">
      Drag inside to move, an edge or corner to resize, and the round handle to rotate.
    </p>
    <div
      class="flex items-center justify-between gap-3 border-t border-parchment-300 pt-3"
    >
      <button
        type="button"
        class="btn-icon px-2 py-1.5 text-red-900 hover:bg-red-100/70"
        @click="emit('remove')"
      >
        Delete {{ appearance.label.toLowerCase() }}
      </button>
      <button
        type="button"
        class="btn-soft-primary rounded-lg px-4 py-1.5 font-semibold"
        @click="emit('done')"
      >
        Done
      </button>
    </div>
  </div>
</template>
