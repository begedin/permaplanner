import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export const useDrawBox = (
  mouseEventReceiver: Ref<HTMLElement | SVGElement | undefined>,
  stageElement: Ref<HTMLElement | SVGElement | undefined> = mouseEventReceiver,
) => {
  const mouseCurrent = ref({ x: 0, y: 0 });
  const mouseInitial = ref({ x: 0, y: 0 });

  const x = computed(() => mouseCurrent.value.x);
  const y = computed(() => mouseCurrent.value.y);

  const box = computed(() => {
    const offsetX = mouseCurrent.value.x - mouseInitial.value.x;
    const offsetY = mouseCurrent.value.y - mouseInitial.value.y;

    const width = Math.abs(offsetX);
    const height = Math.abs(offsetY);

    const x = Math.min(mouseInitial.value.x, mouseInitial.value.x + offsetX);
    const y = Math.min(mouseInitial.value.y, mouseInitial.value.y + offsetY);

    return { x, y, width, height };
  });

  const isDrawing = ref(false);

  let controller = new AbortController();

  onMounted(() => {
    controller = new AbortController();

    mouseEventReceiver.value?.addEventListener(
      'mousedown',
      ((e: MouseEvent) => {
        if (!stageElement.value || e.button !== 0) {
          return;
        }
        const svgOffsetX = stageElement.value.getBoundingClientRect().left;
        const svgOffsetY = stageElement.value.getBoundingClientRect().top;

        mouseInitial.value = { x: e.clientX - svgOffsetX, y: e.clientY - svgOffsetY };

        isDrawing.value = true;
      }) as (e: Event) => void,
      { signal: controller.signal },
    );

    document.addEventListener(
      'mousemove',
      (e) => {
        if (!stageElement.value) {
          return;
        }
        const svgOffsetX = stageElement.value.getBoundingClientRect().left;
        const svgOffsetY = stageElement.value.getBoundingClientRect().top;

        mouseCurrent.value = { x: e.clientX - svgOffsetX, y: e.clientY - svgOffsetY };
      },
      { signal: controller.signal },
    );

    document.addEventListener('mouseup', () => (isDrawing.value = false), {
      signal: controller.signal,
    });

    stageElement.value?.addEventListener('mouseleave', () => (isDrawing.value = false), {
      signal: controller.signal,
    });
  });

  onBeforeUnmount(() => {
    controller.abort();
  });

  return { x, y, box, isDrawing };
};
