import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
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
  await fireEvent.click(await wrapper.findByRole('button', { name: 'Open plant list' }));
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

it('forwards label and placeholder to the combobox input', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: {
      modelValue: defaultPick(),
      label: 'Pick a plant',
      placeholder: 'Type to filter…',
    },
  });
  await waitFor(() => {
    expect(wrapper.getByText('Pick a plant')).toBeVisible();
    expect(wrapper.getByPlaceholderText('Type to filter…')).toBeVisible();
  });
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
  await waitFor(() => {
    expect(wrapper.getByRole('listbox').textContent).toContain('Malus domestica');
    expect(wrapper.getByText(honeycrisp.rowLabel)).toBeVisible();
  });
  expect(honeycrisp.rowLabel).toBe('Honeycrisp');
});

it('filters options by search query', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'comfrey');
  await waitFor(() => {
    expect(wrapper.getByText(/Comfrey/)).toBeVisible();
    expect(wrapper.queryByText('Apple')).not.toBeInTheDocument();
  });
});

it('filters options by Latin species name', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'malus domestica');
  await waitFor(() => {
    expect(wrapper.getByText(/Apple/)).toBeVisible();
    expect(wrapper.queryByText('Comfrey')).not.toBeInTheDocument();
  });
});

it('shows no matches when the query matches nothing', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'zzz-no-plants-zzz');
  await waitFor(() => {
    expect(wrapper.getByText('No matches')).toBeVisible();
  });
});

it('clears the search query when modelValue changes', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'comfrey');
  await waitFor(() => {
    expect(wrapper.getByText(/Comfrey/)).toBeVisible();
  });

  const next = comfreyPick();
  await wrapper.rerender({ modelValue: next });

  expect((wrapper.getByRole('combobox') as HTMLInputElement).value).toBe(next.inputLabel);
});
