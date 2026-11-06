<script setup lang="ts">
  import UiIcon from './uiIcons/UiIcon.vue';
  import type { Landmark } from './gardenDocument';
  import { useMapScaleStore } from './useMapScaleStore';
  const props = defineProps<{ landmark?: Landmark }>();
  const emit = defineEmits<{ update: [landmark: Landmark]; remove: []; done: [] }>();
  const scale = useMapScaleStore();
  const update = (field: 'name' | 'rotation', event: Event) => {
    if (!props.landmark) return;
    const value = (event.target as HTMLInputElement).value;
    if (field === 'rotation') {
      if (!Number.isFinite(Number(value))) return;
      emit('update', {
        ...props.landmark,
        rotation: ((Number(value) % 360) + 360) % 360,
      });
    } else emit('update', { ...props.landmark, name: value.trim() || 'Landmark' });
  };
</script>
<template>
  <div
    v-if="props.landmark"
    role="group"
    aria-label="Landmark details"
    class="paper-floating absolute top-16 right-2 z-10 flex w-64 max-w-[calc(100%-1rem)] max-h-[calc(100%-5rem)] overflow-y-auto flex-col gap-4 p-4 text-sm"
  >
    <div class="flex items-center gap-2 border-b border-parchment-300 pb-3">
      <UiIcon
        name="rectangle"
        class="size-6 text-sage-800"
        aria-hidden="true"
      />
      <h2 class="text-lg font-medium">Landmark</h2>
    </div>
    <label class="paper-field-label"
      >Landmark name
      <input
        class="input-soft w-full px-3 py-2 font-normal text-ink-800"
        :value="props.landmark.name"
        @change="update('name', $event)"
      />
    </label>
    <label class="paper-field-label"
      >Rotation (degrees)
      <input
        type="number"
        class="input-soft w-full px-3 py-2 font-normal text-ink-800"
        :value="Math.round(props.landmark.rotation)"
        @change="update('rotation', $event)"
      />
    </label>
    <p
      v-if="scale.unitLengthPx > 0"
      class="paper-inset rounded-lg border border-parchment-300/70 px-3 py-2 text-center font-medium tabular-nums text-ink-700"
    >
      {{ (props.landmark.width / scale.unitLengthPx).toFixed(2) }} ×
      {{ (props.landmark.height / scale.unitLengthPx).toFixed(2) }} {{ scale.unitLabel }}
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
        Delete landmark
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
