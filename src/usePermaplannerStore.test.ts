import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, expectTypeOf, it } from 'vitest';
import type { DeepReadonly } from 'vue';
import type { Guild } from './gardenTypes';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { usePermaplannerStore } from './usePermaplannerStore';

type PlanViews = Pick<
  ReturnType<typeof usePermaplannerStore>,
  | 'plants'
  | 'guilds'
  | 'landmarks'
  | 'plotBorder'
  | 'backgroundOpacity'
  | 'backgroundImageDataUrl'
  | 'onboardingState'
>;

beforeEach(() => setActivePinia(createPinia()));

it('exposes readonly properties and nested plan data at the type boundary', () => {
  expectTypeOf<PlanViews>().toEqualTypeOf<Readonly<PlanViews>>();
  expectTypeOf<PlanViews['guilds']>().toEqualTypeOf<DeepReadonly<Guild[]>>();
});

it('keeps readonly views current after document replacement and domain actions', () => {
  const view = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.hydrateFromDocument({
    ...session.snapshot(),
    plants: [{ id: 'plant', speciesId: 'apple', cultivarId: null }],
    backgroundOpacity: 0.6,
  });
  expect(view).toMatchObject({
    plants: [{ id: 'plant' }],
    backgroundOpacity: 0.6,
  });
  view.setBackgroundOpacity(0.8);
  view.setBackgroundImage('data:image/png;base64,image');
  expect(view).toMatchObject({
    backgroundOpacity: 0.8,
    backgroundImageDataUrl: 'data:image/png;base64,image',
  });
});
