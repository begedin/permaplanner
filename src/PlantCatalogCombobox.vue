<script lang="ts" setup>
  import { ComboboxButton, ComboboxInput, ComboboxOption } from '@headlessui/vue';
  import { computed, inject, ref, watch } from 'vue';

  import { comboboxPanelOpenKey } from './comboboxPanelOpen';

  import AutoPositionedCombobox from './AutoPositionedCombobox.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import {
    buildCatalogPickGroups,
    type CatalogPickGroup,
    type CatalogPlantPick,
  } from './catalogPlantPick';
  import { plantCatalog } from './plantCatalog';
  import { plantSpeciesDisplayLabel } from './resolvePlant';

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
    submit: [];
  }>();

  const comboboxPanelOpen = inject(comboboxPanelOpenKey, null);

  const onComboboxEnter = (e: KeyboardEvent) => {
    if (comboboxPanelOpen?.value) {
      return;
    }
    e.preventDefault();
    emit('submit');
  };

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
        const speciesHaystack = [g.speciesName, g.speciesLatin].filter(Boolean).join(' ');
        const speciesMatch = speciesHaystack.toLowerCase().includes(q);
        const picks = speciesMatch
          ? g.picks
          : g.picks.filter((p) => p.searchText.includes(q));
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
        class="w-full input-soft py-1 pl-2 pr-9 text-sm text-ink-800"
        :placeholder="placeholder"
        :display-value="displayPickLabel"
        @change="query = ($event.target as HTMLInputElement).value"
        @keydown.enter="onComboboxEnter"
      />
      <ComboboxButton
        type="button"
        class="btn-icon absolute inset-y-0 right-0 flex items-center px-2 text-ink-500 hover:text-ink-800"
        aria-label="Open plant list"
      >
        <UiIcon
          name="chevron-down"
          class="size-4"
        />
      </ComboboxButton>
    </template>
    <template #options>
      <template v-if="filteredPickGroups.length === 0">
        <div class="px-2 py-2 text-xs text-ink-500">No matches</div>
      </template>
      <template v-else>
        <template
          v-for="group in filteredPickGroups"
          :key="group.speciesId"
        >
          <div
            role="presentation"
            class="sticky top-0 z-10 border-b border-parchment-300/55 paper-chip px-2 py-1 text-left text-xs font-semibold text-ink-700"
          >
            {{ plantSpeciesDisplayLabel(group.speciesName, group.speciesLatin) }}
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
                'list-option',
                active && 'list-option-active',
                isSelected && 'list-option-selected',
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
