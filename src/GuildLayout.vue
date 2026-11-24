<script setup lang="ts">
  import { computed, ref, toRef, watch, type DeepReadonly } from 'vue';
  import { useGuildLayout } from './useGuildLayoutState';
  import { routeNames } from './router';
  import PlantMapLabel from './PlantMapLabel.vue';
  import PlantCanopy from './PlantCanopy.vue';
  import GardenMeasure from './GardenMeasure.vue';
  import FutureCanopies from './FutureCanopies.vue';
  import { useFutureView } from './useFutureView';
  import MapShapeLayer from './MapShapeLayer.vue';
  import MapSettings from './MapSettings.vue';
  import { useGardenStore } from './useGardenStore';
  import { useMapShapeStore } from './useMapShapeStore';
  import { useEventListener } from '@vueuse/core';
  import { isEditableTarget, isInMapSettingsOrDialog } from './keyboardShortcuts';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { usePointerSession } from './usePointerSession';
  import { transformClientPoint } from './svgClientToUser';
  import { guildPathData } from './guildPathClip';
  import { pathBounds } from './guildPathBounds';
  import {
    hasPlantPlacement,
    placedCanopies,
    type GardenThing,
    type Guild,
  } from './gardenTypes';

  const props = defineProps<{
    guild: DeepReadonly<Guild>;
    svg: SVGSVGElement;
    pixelsPerUnit: number;
  }>();
  const garden = useGardenStore();
  const shapes = useMapShapeStore();
  const future = useFutureView();
  const {
    selection,
    selectedThingId,
    selectedThing,
    placingThingId,
    selectPlant,
    beginPlacement,
    cancelPlacement,
    deselect,
  } = useGuildLayout();
  const guild = toRef(props, 'guild');
  const guildId = computed(() => guild.value.id);
  const box = computed(() => pathBounds(guild.value.path.flat(2)));
  const draft = ref<GardenThing>();
  const boundary = ref<SVGPathElement>();
  const plantLabelFontSize = computed(() => 11 / props.pixelsPerUnit);
  const message = ref('');
  const showLabels = ref(true);
  const hoveredThingId = ref<string>();
  const focusedThingId = ref<string>();
  const session = usePointerSession();
  const placedThings = computed(() =>
    placedCanopies(
      guild.value.plants.map((t) => (t.id === draft.value?.id ? draft.value : t)),
    ),
  );
  const selectedCanopy = computed(() =>
    placedThings.value.find((t) => t.id === selectedThingId.value),
  );
  const measuredPlant = computed(
    () =>
      placedThings.value.find(
        (t) => t.id === (hoveredThingId.value ?? focusedThingId.value),
      ) ?? selectedCanopy.value,
  );
  const handleSize = computed(() => Math.max(box.value.width, box.value.height) * 0.012);
  const instructions = computed(() => {
    if (placingThingId.value)
      return `Draw a circle to place ${selectedThing.value?.nameOrCultivar}. Click a canopy to select it, or Cancel to stop.`;
    if (!selectedThing.value)
      return 'Choose a plant in the guild card and click its Place pin. Click a canopy to select it.';
    if (hasPlantPlacement(selectedThing.value))
      return `${selectedThing.value.nameOrCultivar}: drag the canopy to move it, or its handle to resize.`;
    return `Click the Place pin beside ${selectedThing.value.nameOrCultivar} to draw its canopy.`;
  });

  watch(
    [selection, selectedThing, () => guild.value.path],
    () => {
      session.cancel();
      message.value = '';
    },
    { flush: 'sync' },
  );

  useEventListener(
    () => props.svg,
    'pointerdown',
    (event: PointerEvent) => startGesture(event, 'place', placingThingId.value),
  );
  const removePlacement = () => {
    session.cancel();
    if (selectedThingId.value)
      garden.removePlantPlacement(guildId.value, selectedThingId.value);
    cancelPlacement();
  };

  useEventListener(window, 'keydown', (event) => {
    if (
      isEditableTarget(event.target) ||
      isInMapSettingsOrDialog(event.target) ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    if (event.key === 'Escape') {
      session.cancel();
      cancelPlacement();
    } else if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      hasPlantPlacement(selectedThing.value)
    ) {
      event.preventDefault();
      removePlacement();
    }
  });

  const startGesture = (
    event: PointerEvent,
    kind: 'place' | 'move' | 'resize',
    thingId?: string,
  ) => {
    if (event.button !== 0) return;
    const existing = guild.value.plants.find((t) => t.id === thingId);
    const svg = props.svg;
    if (!existing) {
      if (kind === 'place') deselect();
      return;
    }
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return;
    const origin = transformClientPoint(matrix, event.clientX, event.clientY);
    const center =
      kind === 'place'
        ? origin
        : { x: existing.x + existing.width / 2, y: existing.y + existing.width / 2 };
    const point = svg.createSVGPoint();
    if (kind === 'place') beginPlacement(existing.id);
    else selectPlant(existing.id);
    svg.focus();
    session.start(event, {
      update: (next) => {
        const edge = transformClientPoint(matrix, next.clientX, next.clientY);
        if (kind === 'move') {
          draft.value = {
            ...existing,
            placed: true,
            x: existing.x + (edge.x - origin.x),
            y: existing.y + (edge.y - origin.y),
          };
        } else if (kind === 'place') {
          const size = Math.max(0, edge.x - origin.x, edge.y - origin.y);
          draft.value = {
            ...existing,
            placed: true,
            x: origin.x,
            y: origin.y,
            width: size,
            height: size,
          };
        } else {
          const distance = Math.hypot(edge.x - center.x, edge.y - center.y);
          const radius = Math.max(
            0,
            existing.width / 2 +
              distance -
              Math.hypot(origin.x - center.x, origin.y - center.y),
          );
          draft.value = {
            ...existing,
            placed: true,
            x: center.x - radius,
            y: center.y - radius,
            width: radius * 2,
            height: radius * 2,
          };
        }
      },
      cancel: () => {
        draft.value = undefined;
      },
      commit: () => {
        const result = draft.value;
        draft.value = undefined;
        if (kind === 'place' && result && result.width / Math.abs(matrix.a) < 6) {
          deselect();
          return;
        }
        if (
          !result ||
          (kind !== 'move' &&
            result.width < Math.max(box.value.width, box.value.height) * 0.004)
        )
          return;
        point.x = result.x + result.width / 2;
        point.y = result.y + result.width / 2;
        if (!boundary.value?.isPointInFill(point)) {
          message.value = 'Keep the plant center inside the guild boundary.';
          return;
        }
        garden.setPlantPlacement(guildId.value, existing.id, result);
        cancelPlacement();
      },
    });
  };
</script>

<template>
  <header class="flex items-start justify-between gap-2">
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <h2 class="mr-auto font-serif text-lg">Plant layout</h2>
      <button
        type="button"
        class="btn-soft inline-flex items-center gap-1 text-sm"
        :aria-pressed="showLabels"
        @click="showLabels = !showLabels"
      >
        <UiIcon name="labels" />
        {{ showLabels ? 'Hide labels' : 'Show labels' }}
      </button>
      <RouterLink
        class="btn-soft inline-flex items-center gap-1 text-sm"
        :to="{ name: routeNames.guildsDetail, params: { guildId } }"
      >
        <UiIcon name="guilds" />
        Back to aerial
      </RouterLink>
    </div>
    <MapSettings in-header />
  </header>
  <div class="flex min-h-10 items-center gap-2 text-sm text-ink-600">
    <p
      class="flex-1"
      aria-live="polite"
    >
      {{ instructions }}
    </p>
    <button
      v-if="placingThingId"
      type="button"
      class="btn-soft"
      @click="deselect"
    >
      Cancel
    </button>
    <button
      v-if="hasPlantPlacement(selectedThing)"
      type="button"
      class="btn-soft inline-flex items-center gap-1"
      title="Remove placement (Delete)"
      @click="removePlacement"
    >
      <UiIcon name="unmap" />Remove placement
    </button>
  </div>
  <p
    v-if="message"
    role="status"
    class="text-sm text-amber-800"
  >
    {{ message }}
  </p>
  <Teleport :to="svg">
    <g>
      <g class="pointer-events-none">
        <MapShapeLayer
          v-for="feature in ['path', 'landmark'] as const"
          :key="feature"
          :feature="feature"
          :shapes="shapes.items(feature)"
          tool="draw"
          :show-labels="false"
        />
        <path
          v-for="neighbor in garden.guilds.filter((g) => g.id !== guildId)"
          :key="neighbor.id"
          :d="guildPathData(neighbor.path)"
          fill="#71865d"
          fill-opacity=".095"
          stroke="#71865d"
          fill-rule="evenodd"
        />
        <path
          ref="boundary"
          :d="guildPathData(guild.path)"
          fill="#71865d"
          fill-opacity=".12"
          stroke="#42613b"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          fill-rule="evenodd"
        />
      </g>
      <PlantCanopy
        v-for="thing in placedThings"
        :key="thing.id"
        :thing="thing"
        :selected="thing.id === selectedThingId"
        role="button"
        :aria-label="`Select ${thing.nameOrCultivar} on layout`"
        :aria-describedby="
          measuredPlant?.id === thing.id ? `plant-size-${thing.id}` : undefined
        "
        :aria-pressed="thing.id === selectedThingId"
        tabindex="0"
        class="cursor-move"
        @pointerenter="hoveredThingId = thing.id"
        @pointerleave="hoveredThingId = undefined"
        @focus="focusedThingId = thing.id"
        @blur="focusedThingId = undefined"
        @pointerdown.stop="startGesture($event, 'move', thing.id)"
        @keydown.enter.prevent="selectPlant(thing.id)"
        @keydown.space.prevent="selectPlant(thing.id)"
      />
      <template v-if="future.horizon !== 'now'">
        <FutureCanopies
          v-for="neighbor in garden.guilds.filter(
            (g) => g.id !== guildId && g.path.length,
          )"
          :key="neighbor.id"
          :plants="neighbor.plants"
        />
        <FutureCanopies :plants="placedThings" />
      </template>
      <PlantMapLabel
        v-for="thing in placedThings"
        :key="`label-${thing.id}`"
        v-show="showLabels || hoveredThingId === thing.id || focusedThingId === thing.id"
        :thing="thing"
        :font-size="plantLabelFontSize"
      />
      <g v-if="selectedCanopy">
        <line
          :x1="selectedCanopy.x + selectedCanopy.width"
          :x2="selectedCanopy.x + selectedCanopy.width + handleSize + 2 / pixelsPerUnit"
          :y1="selectedCanopy.y + selectedCanopy.width / 2"
          :y2="selectedCanopy.y + selectedCanopy.width / 2"
          stroke="#a65b23"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
          class="pointer-events-none"
        />
        <circle
          :cx="selectedCanopy.x + selectedCanopy.width + handleSize + 2 / pixelsPerUnit"
          :cy="selectedCanopy.y + selectedCanopy.width / 2"
          :r="handleSize"
          fill="#fffaf0"
          stroke="#a65b23"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          class="cursor-ew-resize"
          aria-label="Resize selected canopy"
          @pointerdown.stop="startGesture($event, 'resize', selectedThingId)"
        />
      </g>
      <GardenMeasure
        :box="box"
        :plant="measuredPlant"
        :font-size="plantLabelFontSize"
      />
    </g>
  </Teleport>
</template>
