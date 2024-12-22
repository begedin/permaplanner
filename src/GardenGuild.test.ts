import { mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import GardenGuild from './GardenGuild.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useSceneStore } from './useSceneStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

it('draws a bed', async () => {
  const scene = useSceneStore();
  scene.x = 3;
  scene.y = 4;
  scene.isDrawing = false;

  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild' },
      unitLengthPx: 5,
      hovered: false,
      selected: false,
    },
    attachTo: document.body,
  });

  await wrapper.setProps({ selected: true });

  scene.isDrawing = true;
  await wrapper.vm.$nextTick();

  scene.x = 5;
  scene.y = 6;
  await wrapper.vm.$nextTick();

  scene.x = 7;
  scene.y = 8;
  await wrapper.vm.$nextTick();

  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

  expect(wrapper.emitted('update')?.at(0)).toEqual([
    {
      id: 'guild',
      name: 'A guild',
      plants: [],
      path: [
        { x: -8.412678195541842, y: 0.29179606750063236 },
        { x: -6.708203932499369, y: -3.0534230275096768 },
        { x: -0.7082039324993707, y: -7.412678195541842 },
        { x: 6.708203932499367, y: -7.412678195541844 },
        { x: 16.70820393249937, y: 0.9465769724903197 },
        { x: 18.412678195541844, y: 4.291796067500629 },
        { x: 18.412678195541844, y: 11.70820393249937 },
        { x: 16.70820393249937, y: 15.053423027509677 },
        { x: 10.70820393249937, y: 19.412678195541844 },
        { x: 3.291796067500632, y: 19.412678195541844 },
        { x: -0.05342302750967676, y: 17.70820393249937 },
        { x: -8.412678195541842, y: 7.70820393249937 },
        { x: -8.412678195541842, y: 0.29179606750063236 },
      ],
    },
  ]);
});

it('cancells drawing a bed', async () => {
  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild' },
      unitLengthPx: 5,
      hovered: false,
      selected: false,
    },
    attachTo: document.body,
  });

  const scene = useSceneStore();

  await wrapper.setProps({ selected: true });

  scene.isDrawing = true;
  scene.x = 5;
  scene.y = 6;
  scene.x = 7;
  scene.y = 8;

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  scene.isDrawing = false;

  expect(wrapper.emitted('update')).toBeUndefined();
});

it('changes brush size', async () => {
  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild' },
      unitLengthPx: 5,
      hovered: false,
      selected: true,
    },
    attachTo: document.body,
  });

  expect(wrapper.get('polygon').attributes('points')).toBeDefined();
  const pointsAtDefaultSize = wrapper.get('polygon').attributes('points');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtDefaultSize);
  const pointsAtLargerSize = wrapper.get('polygon').attributes('points');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).toEqual(pointsAtDefaultSize);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtDefaultSize);
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtLargerSize);
});
