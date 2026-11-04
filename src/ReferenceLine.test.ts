import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, expect, it } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import ReferenceLine from './ReferenceLine.vue';
import OnboardingText from './OnboardingText.vue';
import { useMapScaleStore } from './useMapScaleStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePermaplannerStore } from './usePermaplannerStore';

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
  });
});

const renderLine = () =>
  mount(
    defineComponent({
      components: { ReferenceLine, OnboardingText },
      template: `<svg><ReferenceLine v-slot="{ onboardingState }">
        <OnboardingText :x="0" :y="0" :onboarding-state="onboardingState" />
      </ReferenceLine></svg>`,
    }),
  );

it('previews locally and commits only the scale edit as one undo step', async () => {
  const wrapper = renderLine();
  const scale = useMapScaleStore();
  const plan = usePermaplannerStore();
  const history = usePlanCommandHistory();
  await wrapper
    .get('[data-ref-line-start]')
    .trigger('mousedown', { button: 0, clientX: 20, clientY: 20 });
  document.dispatchEvent(
    new MouseEvent('mousemove', { buttons: 1, clientX: 45, clientY: 60 }),
  );
  await nextTick();
  expect(wrapper.get('[data-ref-line-start]').attributes()).toMatchObject({
    cx: '45',
    cy: '60',
  });
  expect(scale.start).toEqual({ x: 20, y: 20 });
  history.runMutation(() => {
    plan.backgroundOpacity = 0.8;
  });
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 70 }));
  expect(plan.onboardingState).toBe('movedFirst');
  expect(scale.start).toEqual({ x: 50, y: 70 });
  history.undo();
  expect(scale.start).toEqual({ x: 20, y: 20 });
  expect(plan).toMatchObject({ onboardingState: 'initial', backgroundOpacity: 0.8 });
  history.undo();
  expect(plan.backgroundOpacity).toBe(0.4);
  wrapper.unmount();
});

it.each(['unmount', 'escape', 'replace'] as const)(
  'discards a drag on %s',
  async (cancel) => {
    const wrapper = renderLine();
    const scale = useMapScaleStore();
    await wrapper
      .get('[data-ref-line-start]')
      .trigger('mousedown', { button: 0, clientX: 50, clientY: 70 });
    if (cancel === 'unmount') wrapper.unmount();
    else if (cancel === 'escape')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    else await usePermaplannerStore().resetToNewPlan();
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }));
    expect(scale.start).toEqual({ x: 20, y: 20 });
    expect(usePlanCommandHistory().canUndo).toBe(false);
    if (cancel !== 'unmount') wrapper.unmount();
  },
);

it('shows transient guidance for both drags and restores it on cancellation', async () => {
  const wrapper = renderLine();
  const plan = usePermaplannerStore();
  await wrapper
    .get('[data-ref-line-start]')
    .trigger('mousedown', { button: 0, clientX: 30, clientY: 40 });
  expect(wrapper.get('[data-onboarding-text]').text()).toContain('Try to be as precise');
  expect(plan.onboardingState).toBe('initial');
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, clientY: 40 }));
  await nextTick();
  expect(wrapper.get('[data-onboarding-text]').text()).toContain('move the other point');
  expect(plan.onboardingState).toBe('movedFirst');
  await wrapper
    .get('[data-ref-line-end]')
    .trigger('mousedown', { button: 0, clientX: 100, clientY: 40 });
  expect(wrapper.get('[data-onboarding-text]').text()).toContain('Getting there');
  expect(plan.onboardingState).toBe('movedFirst');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await nextTick();
  expect(wrapper.get('[data-onboarding-text]').text()).toContain('move the other point');
  await wrapper
    .get('[data-ref-line-end]')
    .trigger('mousedown', { button: 0, clientX: 100, clientY: 40 });
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 40 }));
  await nextTick();
  expect(wrapper.get('[data-onboarding-text]').text()).toContain('set the length');
  expect(plan.onboardingState).toBe('movedSecond');
  wrapper.unmount();
});
