<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { v4 as uuidV4 } from 'uuid';
import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
  type CatalogPlantPick,
} from './catalogPlantPick';
import { useGardenStore } from './useGardenStore';
import type {
  GuildFunction,
  GuildLayer,
  PlantOverrideFields,
  UserPlant,
} from './useGardenStore';
import { plantCatalog } from './plantCatalog';
import { resolveUserPlant } from './resolvePlant';
import { PLANT_ICON_OPTIONS } from './plantIconOptions';
import type { PlantIconId } from './plantIcons/iconIds';
import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
import PlantIcon from './PlantIcon.vue';
import UiIcon from './uiIcons/UiIcon.vue';
import PlantFunctions from './PlantFunctions.vue';
import PlantLayers from './PlantLayers.vue';

const garden = useGardenStore();

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

const plantInEditing = ref<UserPlant>(makeNewUserPlant());

const resolvedPreview = computed(() =>
  resolveUserPlant(plantInEditing.value, plantCatalog),
);

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
    if (!pick) {
      return;
    }
    plantInEditing.value.speciesId = pick.speciesId;
    plantInEditing.value.cultivarId = pick.cultivarId;
  },
});

const editingFunctions = ref<GuildFunction[]>([]);
const editingLayers = ref<GuildLayer[]>([]);

const syncGuildFieldsFromResolved = () => {
  const r = resolveUserPlant(plantInEditing.value, plantCatalog);
  editingFunctions.value = [...r.functions];
  editingLayers.value = [...r.layers];
};

watch(
  () => plantInEditing.value,
  () => {
    syncGuildFieldsFromResolved();
  },
  { deep: true, immediate: true },
);

const pickIcon = (iconId: PlantIconId) => {
  const natural = resolveUserPlant(
    {
      ...plantInEditing.value,
      speciesOverride: { ...plantInEditing.value.speciesOverride, iconId: undefined },
    },
    plantCatalog,
  );
  if (iconId === natural.iconId) {
    const rest = { ...plantInEditing.value.speciesOverride };
    delete rest.iconId;
    plantInEditing.value.speciesOverride = Object.keys(rest).length ? rest : undefined;
    return;
  }
  plantInEditing.value.speciesOverride = {
    ...plantInEditing.value.speciesOverride,
    iconId,
  };
};

const save = () => {
  const natural = resolveUserPlant(
    {
      ...plantInEditing.value,
      speciesOverride: {
        ...plantInEditing.value.speciesOverride,
        functions: undefined,
        layers: undefined,
      },
    },
    plantCatalog,
  );

  const prevSo = plantInEditing.value.speciesOverride;
  const speciesOverride: PlantOverrideFields = {};
  if (prevSo?.name) {
    speciesOverride.name = prevSo.name;
  }
  if (prevSo?.iconId) {
    speciesOverride.iconId = prevSo.iconId;
  }
  if (JSON.stringify(editingFunctions.value) !== JSON.stringify(natural.functions)) {
    speciesOverride.functions = [...editingFunctions.value];
  }
  if (JSON.stringify(editingLayers.value) !== JSON.stringify(natural.layers)) {
    speciesOverride.layers = [...editingLayers.value];
  }
  plantInEditing.value.speciesOverride = Object.keys(speciesOverride).length
    ? speciesOverride
    : undefined;

  const index = garden.plants.findIndex((p) => p.id === plantInEditing.value.id);
  const toSave = { ...plantInEditing.value };
  if (index === -1) {
    garden.plants.push(toSave);
  } else {
    garden.plants.splice(index, 1, toSave);
  }
};

const edit = (plant: UserPlant) => {
  plantInEditing.value = {
    ...plant,
    speciesOverride: plant.speciesOverride ? { ...plant.speciesOverride } : undefined,
    cultivarOverride: plant.cultivarOverride ? { ...plant.cultivarOverride } : undefined,
  };
  syncGuildFieldsFromResolved();
};

const newPlant = () => {
  plantInEditing.value = makeNewUserPlant();
  syncGuildFieldsFromResolved();
};

const remove = (plant: UserPlant) => {
  garden.plants = garden.plants.filter((p) => p.id !== plant.id);
};

const isNew = computed(
  () => garden.plants.findIndex((p) => p.id === plantInEditing.value.id) === -1,
);

const customSpeciesName = computed({
  get: () => plantInEditing.value.speciesOverride?.name ?? '',
  set: (v: string) => {
    if (!v.trim()) {
      const rest = { ...plantInEditing.value.speciesOverride };
      delete rest.name;
      plantInEditing.value.speciesOverride = Object.keys(rest).length ? rest : undefined;
      return;
    }
    plantInEditing.value.speciesOverride = {
      ...plantInEditing.value.speciesOverride,
      name: v.trim(),
    };
  },
});

const customCultivarName = computed({
  get: () => plantInEditing.value.cultivarOverride?.name ?? '',
  set: (v: string) => {
    if (!v.trim()) {
      const rest = { ...plantInEditing.value.cultivarOverride };
      delete rest.name;
      plantInEditing.value.cultivarOverride = Object.keys(rest).length ? rest : undefined;
      return;
    }
    plantInEditing.value.cultivarOverride = {
      ...plantInEditing.value.cultivarOverride,
      name: v.trim(),
    };
  },
});
</script>
<template>
  <div class="bg-white p-4 grid grid-flow-col items-start gap-8 rounded-md">
    <div class="flex flex-col gap-1">
      <div
        v-for="plant in garden.plants"
        :key="plant.id"
        role="button"
        class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
        :class="{ 'bg-slate-400': plant.id === plantInEditing.id }"
        :title="resolveUserPlant(plant, plantCatalog).name"
        :aria-label="resolveUserPlant(plant, plantCatalog).name"
        @click="edit(plant)"
      >
        <PlantIcon
          class="w-7 h-7"
          :plant="resolveUserPlant(plant, plantCatalog)"
        />
        <span class="w-28 truncate text-left">{{
          resolveUserPlant(plant, plantCatalog).cultivar ||
          resolveUserPlant(plant, plantCatalog).name
        }}</span>
        <button
          class="bg-red-200 hover:bg-red-300 p-1 rounded-md text-xs flex items-center justify-center"
          aria-label="Delete plant"
          @click.self="remove(plant)"
        >
          <UiIcon name="trash" />
        </button>
      </div>
      <button
        class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
        :class="{ 'bg-slate-400': isNew }"
        @click="newPlant"
      >
        <UiIcon
          name="add"
          class="size-7"
        />
        <span class="w-28 truncate text-left">{{ isNew ? 'New plant' : 'New' }}</span>
      </button>
    </div>

    <div class="flex flex-col gap-3 min-w-[200px]">
      <h2 class="text-slate-800 font-medium">Catalog</h2>
      <PlantCatalogCombobox
        v-model="editingCatalogPick"
        label="Catalog species and cultivar"
      />
    </div>

    <div class="flex flex-col gap-2 p-2 max-w-md">
      <div class="flex flex-row items-center gap-2">
        <PlantIcon
          class="w-14 h-14 shrink-0 border border-slate-200 rounded-md"
          :plant="resolvedPreview"
        />
        <p class="text-sm text-slate-600">
          Preview merges catalog → your species overrides → cultivar → your cultivar
          overrides.
        </p>
      </div>

      <label class="flex flex-col gap-1">
        <span class="text-slate-800">Custom species name (optional)</span>
        <input
          v-model="customSpeciesName"
          class="p-1 border border-slate-300 rounded-md text-slate-800"
          placeholder="Uses catalog name if empty"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-slate-800">Custom cultivar label (optional)</span>
        <input
          v-model="customCultivarName"
          class="p-1 border border-slate-300 rounded-md text-slate-800"
          placeholder="Uses catalog cultivar if empty"
        />
      </label>

      <div class="flex flex-col gap-1">
        <span class="text-slate-800">Icon</span>
        <div
          class="flex flex-row flex-wrap gap-1 max-w-xs"
          role="list"
        >
          <button
            v-for="iconId in PLANT_ICON_OPTIONS"
            :key="iconId"
            type="button"
            class="p-1 rounded border border-transparent hover:bg-slate-100"
            :class="resolvedPreview.iconId === iconId && 'border-sky-400 bg-sky-50'"
            :aria-pressed="resolvedPreview.iconId === iconId"
            :aria-label="iconId"
            @click="pickIcon(iconId)"
          >
            <PlantIcon
              class="w-7 h-7"
              :plant="{ ...resolvedPreview, iconId }"
            />
          </button>
        </div>
      </div>

      <PlantFunctions v-model:value="editingFunctions" />
      <PlantLayers v-model:value="editingLayers" />

      <button
        class="px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600"
        @click="save"
      >
        {{ isNew ? 'Create' : 'Save' }}
      </button>
    </div>
  </div>
</template>
