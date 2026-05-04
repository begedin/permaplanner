import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import { useCameraStore } from './useCameraStore';
import { useScene } from './useScene';
import { useSceneStore } from './useSceneStore';

let pinia: ReturnType<typeof createPinia>;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  document.body.replaceChildren();
});

it('copies CTM user coordinates to worldX and worldY without cameraToWorld', async () => {
  const Host = defineComponent({
    setup() {
      const svgRef = ref<SVGElement | undefined>();
      const stageRef = ref<SVGElement | undefined>();
      useScene(svgRef, stageRef);
      return () =>
        h('svg', { ref: svgRef, xmlns: 'http://www.w3.org/2000/svg' }, [
          h('rect', { ref: stageRef }),
        ]);
    },
  });

  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
  await nextTick();

  const svg = wrapper.get('svg').element as SVGSVGElement;
  svg.getScreenCTM = vi.fn(
    () =>
      ({
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      }) as DOMMatrix,
  );

  const camera = useCameraStore();
  camera.scale = 0.25;
  camera.zoom = 2;

  svg.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 100, clientY: 50, bubbles: true }),
  );
  await nextTick();

  const scene = useSceneStore();
  expect(scene).toMatchObject({ x: 100, y: 50, worldX: 100, worldY: 50 });
  expect(camera.cameraToWorld(100)).toBe(200);

  wrapper.unmount();
});
