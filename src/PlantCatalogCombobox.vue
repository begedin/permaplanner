<script lang="ts" setup>
import { ComboboxButton, ComboboxInput, ComboboxOption } from '@headlessui/vue';
import { computed, ref, watch } from 'vue';

import AutoPositionedCombobox from './AutoPositionedCombobox.vue';
import {
  buildCatalogPickGroups,
  type CatalogPickGroup,
  type CatalogPlantPick,
} from './catalogPlantPick';
import { plantCatalog } from './plantCatalog';

const props = withDefaults(
  defineProps<{
    modelValue: CatalogPlantPick | null;
    /** Visually hidden; for screen readers */
    label?: string;
    placeholder?: string;
  }>(),
  {
    label: 'Species and cultivar',
    placeholder: 'Search plants…',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: CatalogPlantPick | null];
}>();

const catalogSpecies = computed(() =>
  plantCatalog.species.filter((s) => s.id !== 'unknown'),
);

const query = ref('');

const allPickGroups = computed((): CatalogPickGroup[] =>
  buildCatalogPickGroups(catalogSpecies.value),
);

const filteredPickGroups = computed((): CatalogPickGroup[] => {
  const q = query.value.trim().toLowerCase();
  if (!q) {
    return allPickGroups.value;
  }
  return allPickGroups.value
    .map((g) => {
      const speciesMatch = g.speciesName.toLowerCase().includes(q);
      const picks = speciesMatch
        ? g.picks
        : g.picks.filter(
            (p) =>
              p.rowLabel.toLowerCase().includes(q) ||
              p.inputLabel.toLowerCase().includes(q),
          );
      return { ...g, picks };
    })
    .filter((g) => g.picks.length > 0);
});

watch(
  allPickGroups,
  (groups) => {
    const cur = props.modelValue;
    if (cur && groups.some((g) => g.picks.some((p) => p.id === cur.id))) {
      return;
    }
    emit('update:modelValue', groups[0]?.picks[0] ?? null);
  },
  { immediate: true },
);

watch(
  () => props.modelValue?.id,
  () => {
    query.value = '';
  },
);

const displayPickLabel = (p: unknown): string =>
  (p as CatalogPlantPick | null)?.inputLabel ?? '';
</script>

<template>
  <AutoPositionedCombobox
    :model-value="modelValue"
    by="id"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #label>
      {{ label }}
    </template>
    <template #anchor>
      <ComboboxInput
        class="w-full rounded-md border border-slate-300 bg-white py-1 pl-2 pr-9 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        :placeholder="placeholder"
        :display-value="displayPickLabel"
        @change="query = ($event.target as HTMLInputElement).value"
      />
      <ComboboxButton
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 hover:text-slate-800"
        aria-label="Open plant list"
      >
        <span
          class="text-xs leading-none"
          aria-hidden="true"
          >▾</span
        >
      </ComboboxButton>
    </template>
    <template #options>
      <template v-if="filteredPickGroups.length === 0">
        <div class="px-2 py-2 text-xs text-slate-500">No matches</div>
      </template>
      <template v-else>
        <template
          v-for="group in filteredPickGroups"
          :key="group.speciesId"
        >
          <div
            role="presentation"
            class="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-1 text-left text-xs font-semibold text-slate-700"
          >
            {{ group.speciesName }}
          </div>
          <ComboboxOption
            v-for="pick in group.picks"
            :key="pick.id"
            v-slot="{ active, selected: isSelected }"
            as="template"
            :value="pick"
          >
            <div
              :class="[
                'cursor-pointer px-2 py-1.5 text-left text-sm',
                active ? 'bg-emerald-100 text-slate-900' : 'text-slate-700',
                isSelected ? 'font-medium' : '',
              ]"
            >
              {{ pick.rowLabel }}
            </div>
          </ComboboxOption>
        </template>
      </template>
    </template>
  </AutoPositionedCombobox>
</template>
