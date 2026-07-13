import { defineComponent, h, nextTick, onMounted, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useCamera } from './useCamera';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';

let pinia: ReturnType<typeof createPinia>;

const mountCameraHost = async () => {
  const Host = defineComponent({
    setup() {
      const svgRef = ref<SVGSVGElement>();
      const dimensions = ref({
        containerWidth: 500,
        containerHeight: 500,
        worldWidth: 1000,
        worldHeight: 1000,
      });
      const { setupCamera } = useCamera(svgRef, dimensions);
      onMounted(() => setupCamera());
      return () => h('svg', { ref: svgRef, xmlns: 'http://www.w3.org/2000/svg' });
    },
  });

  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
  await nextTick();
  await nextTick();

  const svg = wrapper.get('svg').element as SVGSVGElement;
  svg.setPointerCapture = vi.fn();
  svg.releasePointerCapture = vi.fn();
  svg.hasPointerCapture = vi.fn(() => true);
  svg.getScreenCTM = vi.fn(
    () =>
      ({
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      }) as DOMMatrix,
  );

  return { wrapper, svg };
};

const panPointerId = 42;

const pointerEvent = (
  type: string,
  svg: SVGSVGElement,
  init: PointerEventInit = {},
): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    pointerId: panPointerId,
    ...init,
  });

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);

  if (globalThis.PointerEvent === undefined) {
    globalThis.PointerEvent = class PointerEvent extends MouseEvent {
      readonly pointerId: number;

      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    } as typeof PointerEvent;
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

it('pans from total client movement instead of incremental movementX', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.scale = 0.5;
  camera.zoom = 2;
  camera.x = 100;
  camera.y = 200;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 100,
      clientY: 100,
    }),
  );
  svg.dispatchEvent(
    pointerEvent('pointermove', svg, {
      button: 1,
      buttons: 4,
      clientX: 110,
      clientY: 120,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: 90, y: 180 });

  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 110,
      clientY: 120,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: 90, y: 180 });

  wrapper.unmount();
});

it('applies the release position on pointerup when the last pointermove is skipped', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.scale = 0.5;
  camera.zoom = 1;
  camera.x = 0;
  camera.y = 0;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );
  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 20,
      clientY: 10,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: -40, y: -20 });

  wrapper.unmount();
});

it('does not pan on pointermove unless a middle-button pan is active', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.scale = 0.5;
  camera.zoom = 1;
  camera.x = 25;
  camera.y = 10;

  svg.dispatchEvent(
    pointerEvent('pointermove', svg, {
      clientX: 500,
      clientY: 500,
      buttons: 0,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: 25, y: 10 });

  wrapper.unmount();
});

it('ends pan on pointerup so later pointermove cannot jump the camera', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.scale = 0.5;
  camera.zoom = 1;
  camera.x = 50;
  camera.y = 0;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );
  svg.dispatchEvent(
    pointerEvent('pointermove', svg, {
      button: 1,
      buttons: 4,
      clientX: 10,
      clientY: 0,
    }),
  );
  await nextTick();
  expect(camera).toMatchObject({ x: 30, y: 0 });

  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 10,
      clientY: 0,
    }),
  );
  await nextTick();

  svg.dispatchEvent(
    pointerEvent('pointermove', svg, {
      clientX: 500,
      clientY: 500,
      buttons: 0,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: 30, y: 0 });

  wrapper.unmount();
});

it('wheel zoom keeps the first wheel position as anchor for the zoom session', async () => {
  vi.useFakeTimers();

  const zoomTwice = async (
    first: { x: number; y: number },
    second: { x: number; y: number },
  ) => {
    const { wrapper, svg } = await mountCameraHost();
    const camera = useCameraStore();
    camera.zoom = 1;
    camera.width = 1000;
    camera.height = 1000;
    camera.x = 0;
    camera.y = 0;

    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: first.x,
        clientY: first.y,
        bubbles: true,
      }),
    );
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: second.x,
        clientY: second.y,
        bubbles: true,
      }),
    );

    const result = { x: camera.x, y: camera.y, zoom: camera.zoom };
    wrapper.unmount();
    return result;
  };

  const anchoredTwice = await zoomTwice({ x: 200, y: 200 }, { x: 200, y: 200 });
  const mixedSession = await zoomTwice({ x: 200, y: 200 }, { x: 800, y: 800 });

  expect(mixedSession).toEqual(anchoredTwice);

  vi.useRealTimers();
});

it('mousemove after wheel zoom does not shift the camera', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  const scene = useSceneStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;
  camera.x = 0;
  camera.y = 0;

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  const afterZoom = { x: camera.x, y: camera.y, zoom: camera.zoom };

  scene.worldX = 900;
  scene.worldY = 900;
  svg.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 900,
      clientY: 900,
      buttons: 0,
      bubbles: true,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject(afterZoom);

  wrapper.unmount();
  vi.useRealTimers();
});

it('ignores wheel zoom while middle-button pan is active', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBe(1);

  wrapper.unmount();
});

it('ignores wheel zoom briefly after middle-button pan ends', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );
  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 0,
      clientY: 0,
    }),
  );

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBe(1);

  vi.advanceTimersByTime(200);
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBeGreaterThan(1);

  wrapper.unmount();
  vi.useRealTimers();
});

it('extends wheel zoom cooldown when momentum arrives during the cooldown', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );
  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 0,
      clientY: 0,
    }),
  );

  vi.advanceTimersByTime(50);
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBe(1);

  vi.advanceTimersByTime(201);
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBeGreaterThan(1);

  wrapper.unmount();
  vi.useRealTimers();
});

it('extends wheel zoom cooldown when scroll happens during an active pan', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;

  svg.dispatchEvent(
    pointerEvent('pointerdown', svg, {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
    }),
  );
  vi.advanceTimersByTime(10);
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  svg.dispatchEvent(
    pointerEvent('pointerup', svg, {
      button: 1,
      buttons: 0,
      clientX: 0,
      clientY: 0,
    }),
  );

  vi.advanceTimersByTime(201);
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBeGreaterThan(1);

  wrapper.unmount();
  vi.useRealTimers();
});

it('keeps wheel zoom blocked across rapid consecutive pans', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;
  camera.width = 1000;
  camera.height = 1000;

  const pan = (clientX: number) => {
    svg.dispatchEvent(
      pointerEvent('pointerdown', svg, {
        button: 1,
        buttons: 4,
        clientX,
        clientY: 0,
      }),
    );
    svg.dispatchEvent(
      pointerEvent('pointerup', svg, {
        button: 1,
        buttons: 0,
        clientX,
        clientY: 0,
      }),
    );
  };

  pan(0);
  vi.advanceTimersByTime(50);
  pan(20);

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
  );
  expect(camera.zoom).toBe(1);

  wrapper.unmount();
  vi.useRealTimers();
});

it('ignores tiny wheel deltas from trackpad momentum', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();
  camera.zoom = 1;

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: 1, clientX: 100, clientY: 100, bubbles: true }),
  );

  expect(camera.zoom).toBe(1);

  wrapper.unmount();
});

it('ignores middle-button pan that starts outside the aerial svg', async () => {
  const { wrapper } = await mountCameraHost();
  const camera = useCameraStore();
  camera.scale = 0.5;
  camera.zoom = 1;
  camera.x = 12;
  camera.y = 34;

  document.body.dispatchEvent(
    new PointerEvent('pointerdown', {
      button: 1,
      buttons: 4,
      clientX: 0,
      clientY: 0,
      bubbles: true,
      pointerId: panPointerId,
    }),
  );
  document.body.dispatchEvent(
    new PointerEvent('pointermove', {
      button: 1,
      buttons: 4,
      clientX: 200,
      clientY: 200,
      bubbles: true,
      pointerId: panPointerId,
    }),
  );
  await nextTick();

  expect(camera).toMatchObject({ x: 12, y: 34 });

  wrapper.unmount();
});
