import { computed, ref, type Ref, type DeepReadonly } from 'vue';
import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
  type CatalogPlantPick,
} from './catalogPlantPick';
import type { Guild, MulchLevel } from './gardenTypes';
import type { GuildPlantGroupRow } from './guildPlantGroups';
import { GROWTH_PHASES_FOR_SELECT } from './guildPlantInstanceStatus';
import { plantCatalog } from './plantCatalog';
import { useGardenStore } from './useGardenStore';

type PlantEditor =
  { kind: 'add' } | { kind: 'edit'; plantId: string; thingIds: string[] };
export const useGuildEditor = (guildId: Ref<string>, guild: Ref<DeepReadonly<Guild>>) => {
  const garden = useGardenStore();
  const editingName = ref<string | null>(null);
  const plantEditor = ref<PlantEditor | null>(null);
  const selectedPick = ref<CatalogPlantPick | null>(null);
  const expandedPlantGroupId = ref<string | null>(null);

  const displayedName = computed(() => editingName.value ?? guild.value.name);

  const catalogSpecies = () => plantCatalog.species.filter((s) => s.id !== 'unknown');

  const catalogPickForUserPlant = (userPlantId: string): CatalogPlantPick | null => {
    const up = garden.plants.find((p) => p.id === userPlantId);
    if (!up) {
      return null;
    }
    const groups = buildCatalogPickGroups(catalogSpecies());
    return (
      catalogPickForSpeciesCultivar(groups, up.speciesId, up.cultivarId ?? null) ??
      defaultCatalogPick(catalogSpecies())
    );
  };

  const setEditingName = (e: Event) => {
    editingName.value = (e.target as HTMLInputElement).value;
  };

  const commitName = () => {
    if (editingName.value === null) {
      return;
    }
    const value = editingName.value;
    editingName.value = null;
    garden.updateGuildName(guildId.value, value || '');
  };

  const openAddPlantEditor = () => {
    plantEditor.value = { kind: 'add' };
    selectedPick.value = null;
  };

  const openEditPlantEditor = (row: GuildPlantGroupRow) => {
    plantEditor.value = {
      kind: 'edit',
      plantId: row.plantId,
      thingIds: row.instances.map((thing) => thing.id),
    };
    selectedPick.value = catalogPickForUserPlant(row.plantId);
  };

  const isEditingRow = (row: GuildPlantGroupRow): boolean => {
    const editor = plantEditor.value;
    return editor?.kind === 'edit' && editor.plantId === row.plantId;
  };

  const closePlantEditor = () => {
    plantEditor.value = null;
    selectedPick.value = null;
  };

  const onConfirmPlant = () => {
    if (!selectedPick.value) {
      return;
    }
    const { speciesId, cultivarId } = selectedPick.value;
    const editor = plantEditor.value;
    if (editor?.kind === 'edit') {
      garden.replaceGuildThingsWithCatalogPlant(
        guildId.value,
        editor.thingIds,
        speciesId,
        cultivarId,
      );
    } else {
      garden.addCatalogPlantToGuild(guildId.value, speciesId, cultivarId);
    }
    closePlantEditor();
  };

  const mulchStars: MulchLevel[] = [1, 2, 3, 4, 5];

  const togglePlantGroup = (plantId: string) => {
    expandedPlantGroupId.value = expandedPlantGroupId.value === plantId ? null : plantId;
  };

  const setThingGrowthPhase = (thingId: string, raw: string) => {
    const phase = GROWTH_PHASES_FOR_SELECT.find((option) => option === raw);
    if (raw === '' || phase)
      garden.setGuildThingGrowthPhase(guildId.value, thingId, phase ?? '');
  };

  return {
    editingName,
    displayedName,
    plantEditor,
    selectedPick,
    setEditingName,
    commitName,
    openAddPlantEditor,
    openEditPlantEditor,
    isEditingRow,
    closePlantEditor,
    onConfirmPlant,
    mulchStars,
    togglePlantGroup,
    expandedPlantGroupId,
    setThingGrowthPhase,
  };
};
