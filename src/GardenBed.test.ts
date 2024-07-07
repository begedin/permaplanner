import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import GardenBed from './GardenBed.vue';

it('draws a bed', async () => {
  const wrapper = mount(GardenBed, {
    props: {
      bed: { id: 'bed', path: [] },
      unitLengthPx: 5,
      mouseX: 3,
      mouseY: 4,
      hovered: false,
      selected: false,
    },
    attachTo: document.body,
  });

  await wrapper.setProps({ selected: true });

  document.dispatchEvent(new MouseEvent('mousedown', {}));
  await wrapper.setProps({ mouseX: 5, mouseY: 6 });
  document.dispatchEvent(new MouseEvent('mousemove', {}));
  await wrapper.setProps({ mouseX: 7, mouseY: 8 });
  document.dispatchEvent(new MouseEvent('mousemove', {}));
  document.dispatchEvent(new MouseEvent('mouseup', {}));

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

  expect(wrapper.emitted('update')?.at(0)).toEqual([
    {
      id: 'bed',
      path: [
        { x: -6.412678195541844, y: 2.2917960675006324 },
        { x: -4.708203932499369, y: -1.0534230275096768 },
        { x: 1.2917960675006293, y: -5.412678195541842 },
        { x: 4.999999999999998, y: -6 },
        { x: 12.053423027509675, y: -3.708203932499371 },
        { x: 18.412678195541844, y: 4.291796067500629 },
        { x: 18.412678195541844, y: 11.70820393249937 },
        { x: 16.70820393249937, y: 15.053423027509677 },
        { x: 10.70820393249937, y: 19.412678195541844 },
        { x: 3.291796067500632, y: 19.412678195541844 },
        { x: -4.708203932499368, y: 13.053423027509677 },
        { x: -6.412678195541842, y: 9.70820393249937 },
        { x: -6.412678195541844, y: 2.2917960675006324 },
      ],
    },
  ]);
});
