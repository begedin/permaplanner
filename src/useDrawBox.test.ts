import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';

import { useDrawBox } from './useDrawBox';

afterEach(() => {
  document.body.replaceChildren();
});

const mountDrawBoxHost = async () => {
  const Host = defineComponent({
    setup() {
      const svgRef = ref<SVGSVGElement>();
      const stageRef = ref<SVGRectElement>();
      const { isDrawing } = useDrawBox(svgRef, stageRef);
      return { svgRef, stageRef, isDrawing };
    },
    template: `
      <svg ref="svgRef" xmlns="http://www.w3.org/2000/svg">
        <rect ref="stageRef" width="100" height="100" />
      </svg>
    `,
  });

  const wrapper = mount(Host, { attachTo: document.body });
  await nextTick();

  const svg = wrapper.get('svg').element as SVGSVGElement;
  svg.getScreenCTM = vi.fn(
    () =>
      ({
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      }) as DOMMatrix,
  );

  return wrapper;
};

it('keeps isDrawing true when world stage mouseleave fires during left-button drag', async () => {
  const wrapper = await mountDrawBoxHost();
  const stage = wrapper.get('rect').element as SVGRectElement;

  wrapper
    .get('svg')
    .element.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
  await nextTick();
  expect(wrapper.vm.isDrawing).toBe(true);

  stage.dispatchEvent(
    new MouseEvent('mouseleave', { button: 0, buttons: 1, bubbles: true }),
  );
  await nextTick();
  expect(wrapper.vm.isDrawing).toBe(true);

  document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
  await nextTick();
  expect(wrapper.vm.isDrawing).toBe(false);

  wrapper.unmount();
});

it('ends drawing when world stage mouseleave fires without buttons held', async () => {
  const wrapper = await mountDrawBoxHost();
  const stage = wrapper.get('rect').element as SVGRectElement;

  wrapper
    .get('svg')
    .element.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
  await nextTick();
  expect(wrapper.vm.isDrawing).toBe(true);

  stage.dispatchEvent(
    new MouseEvent('mouseleave', { button: 0, buttons: 0, bubbles: true }),
  );
  await nextTick();
  expect(wrapper.vm.isDrawing).toBe(false);

  wrapper.unmount();
});
