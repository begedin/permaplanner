import { cleanup, fireEvent, render } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
} from './catalogPlantPick';
import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
import { plantCatalog } from './plantCatalog';

const popoverShim = {
  showPopover: vi.fn(),
  hidePopover: vi.fn(),
};

beforeEach(() => {
  Object.assign(HTMLElement.prototype, popoverShim);
});

afterEach(() => {
  cleanup();
  popoverShim.showPopover.mockClear();
  popoverShim.hidePopover.mockClear();
});

const knownSpecies = () => plantCatalog.species.filter((s) => s.id !== 'unknown');

const defaultPick = () => defaultCatalogPick(knownSpecies())!;

const comfreyPick = () =>
  catalogPickForSpeciesCultivar(buildCatalogPickGroups(knownSpecies()), 'comfrey', null)!;

const openList = async (wrapper: ReturnType<typeof render>) => {
  await fireEvent.click(wrapper.getByRole('button', { name: 'Open plant list' }));
};

it('emits the first catalog pick when modelValue is null', () => {
  const onUpdate = vi.fn();
  render(PlantCatalogCombobox, {
    props: {
      modelValue: null,
      'onUpdate:modelValue': onUpdate,
    },
  });
  expect(onUpdate).toHaveBeenCalledWith(defaultPick());
});

it('does not replace a valid modelValue on mount', () => {
  const onUpdate = vi.fn();
  const pick = comfreyPick();
  render(PlantCatalogCombobox, {
    props: {
      modelValue: pick,
      'onUpdate:modelValue': onUpdate,
    },
  });
  expect(onUpdate).not.toHaveBeenCalled();
});

it('forwards label and placeholder to the combobox input', () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: {
      modelValue: defaultPick(),
      label: 'Pick a plant',
      placeholder: 'Type to filter…',
    },
  });
  expect(wrapper.getByText('Pick a plant')).toBeTruthy();
  expect(wrapper.getByPlaceholderText('Type to filter…')).toBeTruthy();
});

it('lists catalog species groups and cultivar rows when open', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  const apple = buildCatalogPickGroups(knownSpecies()).find(
    (g) => g.speciesId === 'apple',
  )!;
  const honeycrisp = apple.picks.find((p) => p.cultivarId === 'honeycrisp')!;
  expect(wrapper.getByRole('listbox').textContent).toContain('Malus domestica');
  expect(wrapper.getByText(honeycrisp.rowLabel)).toBeTruthy();
  expect(honeycrisp.rowLabel).toBe('Honeycrisp');
});

it('filters options by search query', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'comfrey');
  expect(wrapper.getByText(/Comfrey/)).toBeTruthy();
  expect(wrapper.queryByText('Apple')).toBeNull();
});

it('filters options by Latin species name', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'malus domestica');
  expect(wrapper.getByText(/Apple/)).toBeTruthy();
  expect(wrapper.queryByText('Comfrey')).toBeNull();
});

it('shows no matches when the query matches nothing', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'zzz-no-plants-zzz');
  expect(wrapper.getByText('No matches')).toBeTruthy();
});

it('clears the search query when modelValue changes', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'comfrey');
  expect(wrapper.getByText(/Comfrey/)).toBeTruthy();

  const next = comfreyPick();
  await wrapper.rerender({ modelValue: next });

  expect((wrapper.getByRole('combobox') as HTMLInputElement).value).toBe(next.inputLabel);
});
