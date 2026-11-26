import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
import { afterEach, expect, it, vi } from 'vitest';

import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
} from './catalogPlantPick';
import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
import { plantCatalog } from './plantCatalog';

vi.mock(import('./data/plantCatalog.json'), async (importOriginal) => {
  const catalog = await importOriginal();
  const species = catalog.default.species.filter(({ id }) =>
    ['unknown', 'apple', 'comfrey'].includes(id),
  );
  return { ...catalog, species, default: { species } };
});

afterEach(cleanup);

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
  await waitFor(() => {
    expect(wrapper.getByRole('listbox')).toHaveTextContent('Malus domestica');
    expect(wrapper.getByRole('option', { name: 'Honeycrisp' })).toBeVisible();
  });
});

it('filters options by search query', async () => {
  const wrapper = render(PlantCatalogCombobox, {
    props: { modelValue: defaultPick() },
  });
  await openList(wrapper);
  await fireEvent.update(wrapper.getByRole('combobox'), 'comfrey');
  await waitFor(() => {
    expect(wrapper.getByText(/Comfrey/)).toBeVisible();
    expect(wrapper.queryByText(/Apple/)).not.toBeInTheDocument();
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
    expect(wrapper.queryByText(/Comfrey/)).not.toBeInTheDocument();
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

  await waitFor(() => {
    expect(wrapper.getByRole('combobox')).toHaveValue(next.inputLabel);
    expect(wrapper.getByText(/Apple/)).toBeVisible();
  });
});
