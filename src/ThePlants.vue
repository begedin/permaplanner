<script setup lang="ts">
  import type { DeepReadonly } from 'vue';
  import { computed, ref } from 'vue';
  import { v4 as uuidV4 } from 'uuid';
  import {
    buildCatalogPickGroups,
    catalogPickForSpeciesCultivar,
    defaultCatalogPick,
    type CatalogPlantPick,
  } from './catalogPlantPick';
  import { useGardenStore } from './useGardenStore';
  import type { PlantOverrideFields, UserPlant } from './gardenTypes';
  import { getSpecies, plantCatalog } from './plantCatalog';
  import { resolveUserPlant } from './resolvePlant';
  import { PLANT_ICON_IDS } from './plantIcons/iconIds';
  import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
  import AppPageHeader from './AppPageHeader.vue';
  import PlantIcon from './PlantIcon.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import PlantFunctions from './PlantFunctions.vue';
  import PlantLayers from './PlantLayers.vue';

  const garden = useGardenStore();

  const plantRowLabel = (plant: DeepReadonly<UserPlant>): string => {
    const resolved = resolveUserPlant(plant, plantCatalog);
    return resolved.cultivar || resolved.name;
  };

  const knownSpecies = computed(() =>
    plantCatalog.species.filter((s) => s.id !== 'unknown'),
  );

  const makeNewUserPlant = (): UserPlant => {
    const pick = defaultCatalogPick(knownSpecies.value);
    if (!pick) {
      throw new Error('Plant catalog has no species');
    }
    return {
      id: uuidV4(),
      speciesId: pick.speciesId,
      cultivarId: pick.cultivarId,
    };
  };

  const catalogInput = ref<InstanceType<typeof PlantCatalogCombobox> | null>(null);

  const plantInEditing = ref<UserPlant>(makeNewUserPlant());

  const resolvedPreview = computed(() =>
    resolveUserPlant(plantInEditing.value, plantCatalog),
  );

  const savedPlant = computed(() =>
    garden.plants.find((p) => p.id === plantInEditing.value.id),
  );

  const setOverride = (
    slot: 'speciesOverride' | 'cultivarOverride',
    patch: PlantOverrideFields,
  ) => {
    const plant = plantInEditing.value;
    const fields = Object.entries({ ...plant[slot], ...patch }).filter(
      ([, value]) => value !== undefined,
    );
    plant[slot] = fields.length ? Object.fromEntries(fields) : undefined;
  };

  const editingCatalogPick = computed({
    get: (): CatalogPlantPick => {
      const groups = buildCatalogPickGroups(knownSpecies.value);
      const hit = catalogPickForSpeciesCultivar(
        groups,
        plantInEditing.value.speciesId,
        plantInEditing.value.cultivarId ?? null,
      );
      const fallback = defaultCatalogPick(knownSpecies.value);
      return hit ?? fallback!;
    },
    set: (pick: CatalogPlantPick | null) => {
      const plant = plantInEditing.value;
      if (
        !pick ||
        (plant.speciesId === pick.speciesId && plant.cultivarId === pick.cultivarId)
      ) {
        return;
      }
      // A new catalog pick starts with the saved checkbox overrides.
      for (const slot of ['speciesOverride', 'cultivarOverride'] as const) {
        const saved = savedPlant.value?.[slot];
        setOverride(slot, {
          functions: saved?.functions?.slice(),
          layers: saved?.layers?.slice(),
        });
      }
      plant.speciesId = pick.speciesId;
      plant.cultivarId = pick.cultivarId;
    },
  });

  const sameChoices = (a: string[], b: string[]) =>
    a.every((choice) => b.includes(choice)) && b.every((choice) => a.includes(choice));

  const setTrait = <K extends 'functions' | 'layers' | 'iconId'>(
    field: K,
    value: NonNullable<PlantOverrideFields[K]>,
  ) => {
    const plant = plantInEditing.value;
    const cultivar = getSpecies(plant.speciesId)?.cultivars.find(
      (row) => row.id === plant.cultivarId,
    );
    const catalogField = field === 'iconId' ? 'defaultIconId' : field;
    const slot =
      plant.cultivarOverride?.[field] !== undefined ||
      savedPlant.value?.cultivarOverride?.[field] !== undefined ||
      (cultivar && catalogField in cultivar)
        ? 'cultivarOverride'
        : 'speciesOverride';
    const inherited = resolveUserPlant({
      ...plant,
      [slot]: { ...plant[slot], [field]: undefined },
    })[field];
    const same =
      Array.isArray(value) && Array.isArray(inherited)
        ? sameChoices(value, inherited)
        : value === inherited;
    setOverride(slot, { [field]: same ? undefined : value });
  };

  const edit = (plant: DeepReadonly<UserPlant>) => {
    plantInEditing.value = JSON.parse(JSON.stringify(plant));
    void catalogInput.value?.focusAndSelect();
  };

  const isNew = computed(() => !savedPlant.value);

  const customSpeciesName = computed({
    get: () => plantInEditing.value.speciesOverride?.name ?? '',
    set: (name: string) => setOverride('speciesOverride', { name: name || undefined }),
  });

  const customCultivarName = computed({
    get: () => plantInEditing.value.cultivarOverride?.name ?? '',
    set: (name: string) => setOverride('cultivarOverride', { name: name || undefined }),
  });
</script>
<template>
  <div class="flex h-full min-h-0 flex-col">
    <AppPageHeader>
      <template #breadcrumb>
        <h1 class="text-lg font-medium text-ink-800">Plants</h1>
      </template>
    </AppPageHeader>
    <div
      class="paper-card p-4 grid grid-flow-col items-start gap-8 flex-1 min-h-0 overflow-auto"
    >
      <div class="flex flex-col gap-1">
        <div
          v-for="plant in garden.plants"
          :key="plant.id"
          role="button"
          class="selectable-row"
          :class="{ 'selectable-row-active': plant.id === plantInEditing.id }"
          :aria-current="plant.id === plantInEditing.id ? 'true' : undefined"
          :title="resolveUserPlant(plant, plantCatalog).name"
          :aria-label="resolveUserPlant(plant, plantCatalog).name"
          @click="edit(plant)"
        >
          <PlantIcon
            class="w-7 h-7"
            :plant="resolveUserPlant(plant, plantCatalog)"
          />
          <span class="w-28 truncate text-left">{{ plantRowLabel(plant) }}</span>
          <button
            type="button"
            class="btn-danger p-1 rounded-lg text-xs flex items-center justify-center"
            aria-label="Delete plant"
            :disabled="garden.plantIsUsed(plant.id)"
            :title="
              garden.plantIsUsed(plant.id)
                ? 'Remove this plant from its guilds before deleting it.'
                : 'Delete plant'
            "
            @click="garden.removePlant(plant.id)"
          >
            <UiIcon name="trash" />
          </button>
        </div>
        <button
          type="button"
          class="selectable-row"
          :class="{ 'selectable-row-active': isNew }"
          :aria-current="isNew ? 'true' : undefined"
          @click="plantInEditing = makeNewUserPlant()"
        >
          <UiIcon
            name="add"
            class="size-7"
          />
          <span class="w-28 truncate text-left">{{ isNew ? 'New plant' : 'New' }}</span>
        </button>
      </div>

      <div class="flex flex-col gap-3 min-w-[200px]">
        <h2 class="text-ink-800 font-medium">Catalog</h2>
        <PlantCatalogCombobox
          ref="catalogInput"
          v-model="editingCatalogPick"
          label="Catalog species and cultivar"
        />
      </div>

      <div class="flex flex-col gap-2 p-2 max-w-md">
        <div class="flex flex-row items-center gap-2">
          <PlantIcon
            class="w-14 h-14 shrink-0 border border-parchment-300/55 rounded-xl"
            :plant="resolvedPreview"
          />
          <p class="text-sm text-ink-600">
            Preview merges catalog → your species overrides → cultivar → your cultivar
            overrides.
          </p>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-ink-800">Custom species name (optional)</span>
          <input
            v-model.trim="customSpeciesName"
            class="p-1 input-soft text-ink-800"
            placeholder="Uses catalog name if empty"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-ink-800">Custom cultivar label (optional)</span>
          <input
            v-model.trim="customCultivarName"
            class="p-1 input-soft text-ink-800"
            placeholder="Uses catalog cultivar if empty"
          />
        </label>

        <div class="flex flex-col gap-1">
          <span class="text-ink-800">Icon</span>
          <div
            class="flex flex-row flex-wrap gap-1 max-w-xs"
            role="list"
            aria-label="Plant icons"
          >
            <button
              v-for="iconId in PLANT_ICON_IDS"
              :key="iconId"
              type="button"
              class="icon-picker-btn"
              :class="resolvedPreview.iconId === iconId && 'icon-picker-btn-selected'"
              :aria-pressed="resolvedPreview.iconId === iconId"
              :aria-label="iconId"
              @click="setTrait('iconId', iconId)"
            >
              <PlantIcon
                class="w-7 h-7"
                :plant="{ ...resolvedPreview, iconId }"
              />
            </button>
          </div>
        </div>

        <PlantFunctions
          :value="[...new Set(resolvedPreview.functions)]"
          @update:value="setTrait('functions', $event)"
        />
        <PlantLayers
          :value="[...new Set(resolvedPreview.layers)]"
          @update:value="setTrait('layers', $event)"
        />

        <button
          class="px-3 py-1.5 btn-soft-muted btn-soft-sm text-sm"
          @click="garden.savePlant(plantInEditing)"
        >
          {{ isNew ? 'Create' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
