<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';
  import type { MapShape } from './gardenDocument';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useAerialMapBounds } from './aerialMapBounds';
  import { fitShapeRotation } from './mapShapeGeometry';
  const world = useAerialMapBounds();
  const props = defineProps<{
    shape: MapShape;
    feature: ShapeFeature;
    toolbarTarget?: HTMLElement;
  }>();
  const appearance = computed(() => SHAPE_FEATURES[props.feature]);
  const emit = defineEmits<{ update: [shape: MapShape]; remove: []; done: [] }>();
  const scale = useMapScaleStore();
  const open = ref(true);
  const heading = ref<HTMLElement>();
  const onToggle = async (event: Event) => {
    const details = event.currentTarget as HTMLDetailsElement;
    if (details.open === open.value) return;
    const restoreFocus = document.activeElement === heading.value;
    open.value = details.open;
    if (restoreFocus) {
      await nextTick();
      heading.value?.focus({ preventScroll: true });
    }
  };
  const update = (field: 'name' | 'rotation', event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'rotation') {
      if (!world.value || !Number.isFinite(Number(value))) return;
      const shape =
        fitShapeRotation(props.shape, Number(value), world.value) ?? props.shape;
      (event.target as HTMLInputElement).value = String(Math.round(shape.rotation));
      emit('update', shape);
    } else
      emit('update', { ...props.shape, name: value.trim() || appearance.value.label });
  };
</script>
<template>
  <Teleport
    :to="toolbarTarget"
    :disabled="open || !toolbarTarget"
  >
    <details
      open
      :aria-label="`${appearance.label} details`"
      class="pointer-events-auto text-sm"
      :class="{ 'paper-floating w-64 max-w-full min-h-0 overflow-y-auto': open }"
      @toggle="onToggle"
    >
      <summary
        ref="heading"
        :title="`${appearance.label} details`"
        class="flex cursor-pointer list-none items-center font-medium [&::-webkit-details-marker]:hidden"
        :class="
          open ? 'gap-2 border-b border-parchment-300 px-4 py-2' : 'map-control-button'
        "
      >
        <UiIcon
          :name="open ? appearance.icon : 'document'"
          :class="open ? 'size-6 text-sage-800' : 'size-5'"
          aria-hidden="true"
        />
        <span :class="{ 'sr-only': !open }">{{ appearance.label }} details</span>
        <UiIcon
          v-if="open"
          name="chevron-down"
          class="ml-auto size-4 rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div class="flex flex-col gap-4 p-4">
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
            :disabled="!world"
            class="input-soft w-full px-3 py-2 font-normal text-ink-800"
            :value="Math.round(props.shape.rotation)"
            @change="update('rotation', $event)"
          />
        </label>
        <p
          class="paper-inset rounded-lg border border-parchment-300/70 px-3 py-2 text-center font-medium tabular-nums text-ink-700"
        >
          {{ (props.shape.width / scale.measurement.pixelsPerUnit).toFixed(2) }} ×
          {{ (props.shape.height / scale.measurement.pixelsPerUnit).toFixed(2) }}
          {{ scale.measurement.unit }}
        </p>
        <p class="text-xs leading-relaxed text-ink-600">
          Drag the shape to move it, a square handle to resize it, or the round handle to
          rotate it.
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
    </details>
  </Teleport>
</template>
