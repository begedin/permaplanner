<script setup lang="ts">
  import { computed, ref, shallowRef, watch } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import type { MapShape } from './gardenDocument';
  import {
    SHAPE_RESIZE_EDGES,
    SHAPE_RESIZE_HANDLES,
    type ShapeGesture,
  } from './mapShapeGeometry';
  import type { ShapeFeature } from './mapShapeFeatures';
  import { useCameraStore } from './useCameraStore';

  type Handle = (typeof SHAPE_RESIZE_HANDLES)[number];
  const props = defineProps<{
    shape: MapShape;
    feature: ShapeFeature;
    size: number;
    map?: SVGSVGElement;
  }>();
  const emit = defineEmits<{
    resize: [event: PointerEvent, gesture: Extract<ShapeGesture, { kind: 'resize' }>];
  }>();
  const resize = (event: PointerEvent, direction: Handle) =>
    emit('resize', event, { kind: 'resize', shape: props.shape, direction });
  const camera = useCameraStore();
  const resizeGroup = ref<SVGGElement>();
  const resizeCursors = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  const cursorFor = (direction: Handle) =>
    resizeCursors[Math.round((props.shape.rotation + direction.angle) / 45) % 4]!;
  const resizeHandles = computed(() => {
    const { shape, size } = props;
    const angle = (shape.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const margin = ((Math.abs(cos) + Math.abs(sin)) * size) / 2;
    const toMap = (x: number, y: number) => ({
      x: shape.x + cos * x - sin * y,
      y: shape.y + sin * x + cos * y,
    });
    const halfWidth = Math.max(shape.width / 2, 2 * size);
    const halfHeight = Math.max(shape.height / 2, 2 * size);
    const right = camera.x + camera.width;
    const bottom = camera.y + camera.height;
    return SHAPE_RESIZE_HANDLES.map((direction) => {
      const anchor = toMap(
        (direction.x * shape.width) / 2,
        (direction.y * shape.height) / 2,
      );
      const grip = toMap(direction.x * halfWidth, direction.y * halfHeight);
      const visible =
        anchor.x >= camera.x - 1e-7 &&
        anchor.x <= right + 1e-7 &&
        anchor.y >= camera.y - 1e-7 &&
        anchor.y <= bottom + 1e-7;
      const x = Math.max(camera.x + margin, Math.min(grip.x, right - margin));
      const y = Math.max(camera.y + margin, Math.min(grip.y, bottom - margin));
      return { direction, visible, x, y };
    });
  });

  // Features sit above the handles so a neighboring feature still receives a swipe.
  const controlBehindFeature = (event: PointerEvent) => {
    const feature = event.target;
    if (
      !(feature instanceof SVGGeometryElement) ||
      !feature.hasAttribute('data-map-feature')
    )
      return;
    const control = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el) => el.hasAttribute('data-resize') && resizeGroup.value?.contains(el));
    if (!control) return;
    const edge = control instanceof SVGLineElement;
    if (edge && event.pointerType === 'touch') return;
    const { shape, size } = props;
    if (feature.getAttribute('data-map-feature') === 'selected') {
      if (!edge && Math.max(shape.width, shape.height) <= size) return;
    } else {
      // A handle can extend into a guild that contains the selected shape's center.
      const map = event.currentTarget as SVGSVGElement;
      const selected = map.querySelector<SVGPathElement>('[data-map-feature="selected"]');
      if (
        !selected ||
        !(feature.compareDocumentPosition(selected) & Node.DOCUMENT_POSITION_FOLLOWING)
      )
        return;
      const center = selected.getScreenCTM();
      const transform = feature.getScreenCTM();
      if (!center || !transform) return;
      const local = transform.inverse().multiply(center);
      const point = map.createSVGPoint();
      point.x = local.e;
      point.y = local.f;
      if (!feature.isPointInFill(point)) return;
    }
    return SHAPE_RESIZE_HANDLES.find(
      (handle) => handle.name === control.getAttribute('data-resize'),
    );
  };
  useEventListener(
    () => props.map,
    'pointerdown',
    (event: PointerEvent) => {
      if (event.button !== 0) return;
      const direction = controlBehindFeature(event);
      if (direction) resize(event, direction);
    },
    { capture: true },
  );

  const hovered = shallowRef<SVGElement>();
  const cursor = ref('');
  watch([hovered, cursor], ([element, value], _, onCleanup) => {
    if (!element) return;
    const previous = element.style.cursor;
    element.style.cursor = value;
    onCleanup(() => {
      element.style.cursor = previous;
    });
  });
  useEventListener(
    () => props.map,
    ['pointermove', 'pointerout'],
    (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.buttons) return;
      const direction = event.type === 'pointermove' && controlBehindFeature(event);
      hovered.value =
        direction && event.target instanceof SVGElement ? event.target : undefined;
      cursor.value = direction ? cursorFor(direction) : '';
    },
  );
</script>
<template>
  <g
    ref="resizeGroup"
    @mousedown.stop
  >
    <g :transform="`translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`">
      <line
        v-for="edge in SHAPE_RESIZE_EDGES"
        :key="edge.name"
        :data-resize="edge.name"
        :x1="((edge.x || -1) * shape.width) / 2"
        :x2="((edge.x || 1) * shape.width) / 2"
        :y1="((edge.y || -1) * shape.height) / 2"
        :y2="((edge.y || 1) * shape.height) / 2"
        stroke="transparent"
        :stroke-width="Math.min(2 * size, (edge.x ? shape.width : shape.height) / 2)"
        :aria-label="`Resize ${feature} ${edge.name} edge`"
        :style="{ cursor: cursorFor(edge) }"
        @pointerdown="$event.pointerType !== 'touch' && resize($event, edge)"
      />
    </g>
    <rect
      v-for="handle in resizeHandles"
      v-show="handle.visible"
      :key="handle.direction.name"
      :data-resize="handle.direction.name"
      :transform="`translate(${handle.x} ${handle.y}) rotate(${shape.rotation})`"
      :x="-size / 2"
      :y="-size / 2"
      :width="size"
      :height="size"
      fill="#315b45"
      :aria-label="`Resize ${feature} ${handle.direction.name} handle`"
      class="touch-none"
      :style="{ cursor: cursorFor(handle.direction) }"
      @pointerdown="resize($event, handle.direction)"
    />
  </g>
</template>
