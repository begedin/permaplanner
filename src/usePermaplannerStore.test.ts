import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { usePermaplannerStore } from './usePermaplannerStore';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('snapshotForServer omits backgroundImage when unchanged', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = 'data:image/png;base64,abc';
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,abc';

  expect(store.snapshotForServer()).not.toHaveProperty('backgroundImage');
  expect(store.snapshot()).toMatchObject({
    backgroundImage: 'data:image/png;base64,abc',
  });
});

it('snapshotForServer includes backgroundImage when changed', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = 'data:image/png;base64,new';
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,old';

  expect(store.snapshotForServer()).toMatchObject({
    backgroundImage: 'data:image/png;base64,new',
  });
});

it('snapshotForServer sends null when background was cleared', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = undefined;
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,old';

  expect(store.snapshotForServer()).toMatchObject({
    backgroundImage: null,
  });
});
