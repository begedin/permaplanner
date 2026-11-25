import { defineComponent, h, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useCamera, type CameraFocus } from './useCamera';
import { useCameraStore } from './useCameraStore';

let pinia: ReturnType<typeof createPinia>;

const mountCameraHost = async (zoom = 1) => {
  const focus = ref<CameraFocus>();
  const dimensions = ref({
    containerWidth: 500,
    containerHeight: 500,
    worldWidth: 1000,
    worldHeight: 1000,
  });
  const Host = defineComponent({
    setup() {
      const svgRef = ref<SVGSVGElement>();
      const { setupCamera, teardownCamera } = useCamera(
        svgRef,
        dimensions,
        undefined,
        focus,
      );
      onMounted(() => setupCamera());
      onUnmounted(teardownCamera);
      return () => h('svg', { ref: svgRef, xmlns: 'http://www.w3.org/2000/svg' });
    },
  });

  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
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

  if (zoom !== 1) {
    svg.dispatchEvent(
      new WheelEvent('wheel', { ctrlKey: true, deltaY: -100 * Math.log(zoom) }),
    );
  }
  return { wrapper, svg, dimensions, focus };
};

it('refits a focused bed on rotation and preserves a manually panned center', async () => {
  const { wrapper, svg, dimensions, focus } = await mountCameraHost();
  const camera = useCameraStore();
  const center = () => ({
    x: camera.x + camera.width / 2,
    y: camera.y + camera.height / 2,
  });
  focus.value = () => ({ x: 340, y: 520, width: 160, height: 120 });
  for (const [containerWidth, containerHeight, shortSide] of [
    [390, 708, 185.6],
    [844, 254, 145.6],
  ] as const) {
    dimensions.value = { ...dimensions.value, containerWidth, containerHeight };
    await nextTick();
    expect(center()).toEqual({ x: expect.closeTo(420), y: expect.closeTo(580) });
    expect(Math.min(camera.width, camera.height)).toBeCloseTo(shortSide);
    pointer(svg, 'pointerdown', { button: 1, buttons: 4 });
    pointer(svg, 'pointerup', { button: 1 });
  }
  svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 35, deltaY: -45 }));
  dimensions.value = { ...dimensions.value, containerWidth: 390, containerHeight: 708 };
  await nextTick();
  expect(center()).toEqual({ x: expect.closeTo(455), y: expect.closeTo(535) });
  wrapper.unmount();
});

const pointer = (target: EventTarget, type: string, init: MouseEventInit = {}) => {
  const event = new MouseEvent(type, { bubbles: true, ...init });
  target.dispatchEvent(Object.assign(event, { pointerId: 42 }));
};

const wheelZoom = (svg: SVGSVGElement, clientX = 100, clientY = 100) =>
  svg.dispatchEvent(
    new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY: -100,
      clientX,
      clientY,
      bubbles: true,
    }),
  );

const safariPinch = (svg: SVGSVGElement, type: string, scale: number) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { scale, clientX: 200, clientY: 300 });
  svg.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it('pans only between a middle-button press and its release', async () => {
  const { wrapper, svg } = await mountCameraHost(2);
  const camera = useCameraStore();
  camera.x = 100;
  camera.y = 200;

  pointer(svg, 'pointermove', { clientX: 500, clientY: 500 });
  expect(camera).toMatchObject({ x: 100, y: 200 });
  pointer(svg, 'pointerdown', { button: 1, buttons: 4, clientX: 100, clientY: 100 });
  pointer(svg, 'pointermove', { buttons: 4, clientX: 110, clientY: 120 });
  expect(camera).toMatchObject({ x: 90, y: 180 });
  pointer(svg, 'pointerup', { button: 1, clientX: 110, clientY: 120 });
  expect(camera).toMatchObject({ x: 90, y: 180 });
  pointer(svg, 'pointermove', { clientX: 500, clientY: 500 });
  expect(camera).toMatchObject({ x: 90, y: 180 });
  wrapper.unmount();
});

it('applies the release position on pointerup when the last pointermove is skipped', async () => {
  const { wrapper, svg } = await mountCameraHost(2);
  const camera = useCameraStore();
  camera.x = 50;
  camera.y = 50;

  pointer(svg, 'pointerdown', { button: 1, buttons: 4 });
  pointer(svg, 'pointerup', { button: 1, clientX: 20, clientY: 10 });
  await nextTick();

  expect(camera).toMatchObject({ x: 30, y: 40 });

  wrapper.unmount();
});

it('wheel zoom keeps the first wheel position as anchor for the zoom session', async () => {
  vi.useFakeTimers();

  const zoomTwice = async (second: number) => {
    const { wrapper, svg } = await mountCameraHost();
    const camera = useCameraStore();

    wheelZoom(svg, 200, 200);
    wheelZoom(svg, second, second);

    const result = { x: camera.x, y: camera.y, zoom: camera.zoom };
    wrapper.unmount();
    return result;
  };

  const anchoredTwice = await zoomTwice(200);
  const mixedSession = await zoomTwice(800);

  expect(mixedSession).toEqual(anchoredTwice);
});

it('mousemove after wheel zoom does not shift the camera', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  wheelZoom(svg);
  const afterZoom = { x: camera.x, y: camera.y, zoom: camera.zoom };

  pointer(svg, 'pointermove', { clientX: 900, clientY: 900 });
  await nextTick();

  expect(camera).toMatchObject(afterZoom);

  wrapper.unmount();
});

it('blocks wheel zoom after a pan until the last momentum event expires', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  pointer(svg, 'pointerdown', { button: 1, buttons: 4 });
  pointer(svg, 'pointerup', { button: 1 });

  wheelZoom(svg);
  expect(camera.zoom).toBe(1);

  vi.advanceTimersByTime(50);
  wheelZoom(svg);
  expect(camera.zoom).toBe(1);

  vi.advanceTimersByTime(151);
  wheelZoom(svg);
  expect(camera.zoom).toBe(1);
  vi.advanceTimersByTime(200);
  wheelZoom(svg);
  expect(camera.zoom).toBeGreaterThan(1);

  wrapper.unmount();
});

it('blocks wheel zoom during a pan and accepts it after the release cooldown', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  pointer(svg, 'pointerdown', { button: 1, buttons: 4 });
  vi.advanceTimersByTime(10);
  wheelZoom(svg);
  expect(camera.zoom).toBe(1);
  pointer(svg, 'pointerup', { button: 1 });

  vi.advanceTimersByTime(201);
  wheelZoom(svg);
  expect(camera.zoom).toBeGreaterThan(1);

  wrapper.unmount();
});

it('keeps wheel zoom blocked across rapid consecutive pans', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  const pan = (clientX: number) => {
    pointer(svg, 'pointerdown', { button: 1, buttons: 4, clientX });
    pointer(svg, 'pointerup', { button: 1, clientX });
  };

  pan(0);
  vi.advanceTimersByTime(50);
  pan(20);

  wheelZoom(svg);
  expect(camera.zoom).toBe(1);

  wrapper.unmount();
});

it('pans with tiny wheel deltas from trackpad momentum', async () => {
  const { wrapper, svg } = await mountCameraHost(2);
  const camera = useCameraStore();

  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY: 1, clientX: 100, clientY: 100, bubbles: true }),
  );

  expect(camera).toMatchObject({ zoom: 2, y: 1 });

  wrapper.unmount();
});

it('ignores middle-button pan that starts outside the aerial svg', async () => {
  const { wrapper } = await mountCameraHost(2);
  const camera = useCameraStore();
  camera.x = 12;
  camera.y = 34;

  pointer(document.body, 'pointerdown', { button: 1, buttons: 4 });
  pointer(document.body, 'pointermove', {
    button: 1,
    buttons: 4,
    clientX: 200,
    clientY: 200,
  });
  await nextTick();

  expect(camera).toMatchObject({ x: 12, y: 34 });

  wrapper.unmount();
});

it.each([
  { deltaMode: 0, x: 1, y: 499 },
  { deltaMode: 1, x: 16, y: 484 },
  { deltaMode: 2, x: 500, y: 0 },
])(
  'pans both axes in wheel delta mode $deltaMode without zooming',
  async ({ deltaMode, x, y }) => {
    const { wrapper, svg } = await mountCameraHost(2);
    const camera = useCameraStore();
    camera.y = 500;
    const event = new WheelEvent('wheel', {
      deltaX: 1,
      deltaY: -1,
      deltaMode,
      cancelable: true,
    });
    svg.dispatchEvent(event);
    expect(camera).toMatchObject({ x, y, zoom: 2 });
    expect(event.defaultPrevented).toBe(true);
    wrapper.unmount();
    svg.dispatchEvent(event);
    expect(camera).toMatchObject({ x, y, zoom: 2 });
  },
);

it('pinches smoothly around the cursor, including small deltas and zoom limits', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  const steps = [
    [-3, expect.closeTo(Math.exp(0.03), 12)],
    [2, expect.closeTo(Math.exp(0.01), 12)],
    [-10000, 10],
    [10000, 1],
  ] as const;
  for (const [deltaY, expectedZoom] of steps) {
    const event = new WheelEvent('wheel', {
      ctrlKey: true,
      deltaY,
      clientX: 200,
      clientY: 300,
      cancelable: true,
    });
    svg.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect((200 - camera.x) / camera.width).toBeCloseTo(0.2);
    expect((300 - camera.y) / camera.height).toBeCloseTo(0.3);
    expect(camera.zoom).toEqual(expectedZoom);
  }
  wrapper.unmount();
});

it('uses Safari cumulative pinch scale and resumes scrolling when the gesture ends', async () => {
  const { wrapper, svg } = await mountCameraHost();
  const camera = useCameraStore();

  expect(safariPinch(svg, 'gesturestart', 1).defaultPrevented).toBe(true);
  safariPinch(svg, 'gesturechange', 2);
  safariPinch(svg, 'gesturechange', 3);
  expect(camera).toMatchObject({ zoom: 3 });
  expect((200 - camera.x) / camera.width).toBeCloseTo(0.2);
  expect((300 - camera.y) / camera.height).toBeCloseTo(0.3);
  svg.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -100 }));
  expect(camera.zoom).toBe(3);
  safariPinch(svg, 'gestureend', 3);
  const previousX = camera.x;
  svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 30 }));
  expect(camera.x).toBeCloseTo(previousX + 30);

  wrapper.unmount();
  safariPinch(svg, 'gesturestart', 1);
  safariPinch(svg, 'gesturechange', 2);
  expect(camera.zoom).toBe(3);
});

it('allows touchpad pan immediately after a mouse drag without extending the zoom cooldown', async () => {
  vi.useFakeTimers();
  const { wrapper, svg } = await mountCameraHost(2);
  const camera = useCameraStore();
  pointer(svg, 'pointerdown', { button: 1 });
  svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 20, deltaY: 30 }));
  expect(camera).toMatchObject({ x: 0, y: 0, zoom: 2 });
  pointer(svg, 'pointerup', { button: 1 });

  vi.advanceTimersByTime(100);
  svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 20, deltaY: 30 }));
  expect(camera).toMatchObject({ x: 20, y: 30, zoom: 2 });
  vi.advanceTimersByTime(100);
  svg.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -1 }));
  expect(camera.zoom).toBeGreaterThan(2);
  wrapper.unmount();
});

it.each(['blur', 'pan'])(
  'cancels Safari pinch when interrupted by %s',
  async (interruption) => {
    const { wrapper, svg } = await mountCameraHost();
    const camera = useCameraStore();
    safariPinch(svg, 'gesturestart', 1);
    safariPinch(svg, 'gesturechange', 2);
    if (interruption === 'blur') {
      window.dispatchEvent(new Event('blur'));
    } else {
      pointer(svg, 'pointerdown', { button: 1 });
    }
    safariPinch(svg, 'gesturechange', 3);
    safariPinch(svg, 'gestureend', 3);
    expect(camera.zoom).toBe(2);
    if (interruption === 'pan') {
      const previousX = camera.x;
      pointer(svg, 'pointermove', { clientX: 20 });
      expect(camera.x).toBeCloseTo(previousX - 20);
    } else {
      const previousX = camera.x;
      svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 20 }));
      expect(camera.x).toBeCloseTo(previousX + 20);
    }
    wrapper.unmount();
  },
);

it('uses the current SVG transform for touchpad pan after resizing', async () => {
  const { wrapper, svg } = await mountCameraHost(2);
  const camera = useCameraStore();
  camera.y = 100;
  let inverseScale = 2;
  svg.getScreenCTM = vi.fn(
    () =>
      ({
        inverse: () => ({ a: inverseScale, b: 0, c: 0, d: inverseScale, e: 100, f: -50 }),
      }) as DOMMatrix,
  );
  const scroll = () =>
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 200,
        clientY: 300,
        deltaX: 20,
        deltaY: -30,
      }),
    );
  scroll();
  expect(camera).toMatchObject({ x: 40, y: 40, zoom: 2 });

  inverseScale = 0.5;
  scroll();
  expect(camera).toMatchObject({ x: 50, y: 25, zoom: 2 });
  wrapper.unmount();
});
