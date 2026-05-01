import { render, screen, fireEvent, cleanup } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import ThePlants from './ThePlants.vue';
import { setActivePinia } from 'pinia';
import { useGardenStore } from './useGardenStore';
import { plantCatalog } from './plantCatalog';
import { resolveUserPlant } from './resolvePlant';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  useGardenStore().plants = [];
});

afterEach(() => {
  cleanup();
});

it('creates a plant from catalog defaults', async () => {
  render(ThePlants);

  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  const up = useGardenStore().plants[0];
  expect(up.speciesId).toBe(plantCatalog.species.filter((s) => s.id !== 'unknown')[0]?.id);
  const r = resolveUserPlant(up, plantCatalog);
  expect(r.functions.length).toBeGreaterThan(0);
});

it('can override guild functions and save', async () => {
  render(ThePlants);

  await fireEvent.click(screen.getByRole('checkbox', { name: 'Wildfire Suppressor' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  const r = resolveUserPlant(useGardenStore().plants[0], plantCatalog);
  expect(r.functions).toContain('wildfire_suppressor');
});

it('can set custom species name', async () => {
  render(ThePlants);

  await fireEvent.update(screen.getByPlaceholderText('Uses catalog name if empty'), 'Herb patch');
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(resolveUserPlant(useGardenStore().plants[0], plantCatalog).name).toBe('Herb patch');
});
