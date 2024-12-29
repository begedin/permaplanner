import { render, screen, fireEvent, cleanup } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import ThePlants from './ThePlants.vue';
import { setActivePinia } from 'pinia';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  useGardenStore().plants = [];
});

afterEach(() => {
  cleanup();
});

it('creates an edible plant', async () => {
  render(ThePlants);

  await fireEvent.click(screen.getByRole('button', { name: 'New' }));

  await fireEvent.update(screen.getByLabelText('Name'), 'Apple');
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Edible' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  expect(useGardenStore().plants[0].name).toBe('Apple');
  expect(useGardenStore().plants[0].features).toEqual([]);
  expect(useGardenStore().plants[0].functions).toEqual(['edible']);
  expect(useGardenStore().plants[0].layers).toEqual([]);
});

it('creates a medicinal herb plant', async () => {
  render(ThePlants);

  await fireEvent.click(screen.getByRole('button', { name: 'New' }));

  await fireEvent.update(screen.getByLabelText('Name'), 'Herb');
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Edible' }));
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Medicinal' }));
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Herb' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  expect(useGardenStore().plants[0].name).toBe('Herb');
  expect(useGardenStore().plants[0].functions).toEqual(['edible', 'medicinal']);
  expect(useGardenStore().plants[0].layers).toEqual(['herb']);
});
