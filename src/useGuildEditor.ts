import { computed, ref, type Ref, type DeepReadonly } from 'vue';
import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
  type CatalogPlantPick,
} from './catalogPlantPick';
import type { GardenThing, Guild, MulchLevel } from './gardenTypes';
import type { GuildPlantGroupRow } from './guildPlantGroups';
import { GROWTH_PHASES_FOR_SELECT } from './guildPlantInstanceStatus';
import { phenologySummaryForPlant, plantCatalog } from './plantCatalog';
import { useGardenStore } from './useGardenStore';

type PlantEditor =
  | { kind: 'add' }
  | { kind: 'edit'; plantId: string; thingIds: string[] };
export const useGuildEditor = (guildId: Ref<string>, guild: Ref<DeepReadonly<Guild>>) => {
  const garden = useGardenStore();
  const editingName = ref<string | null>(null);
  const editingNote = ref<string | null>(null);
  const plantEditor = ref<PlantEditor | null>(null);
  const selectedPick = ref<CatalogPlantPick | null>(null);
  const expandedPlantGroupId = ref<string | null>(null);

  const displayedName = computed(() => editingName.value ?? guild.value.name);
  const displayedNote = computed(() => editingNote.value ?? guild.value.note ?? '');

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

  const setEditingNote = (e: Event) => {
    editingNote.value = (e.target as HTMLTextAreaElement).value;
  };

  const commitNote = () => {
    if (editingNote.value === null) {
      return;
    }
    const value = editingNote.value;
    editingNote.value = null;
    garden.updateGuildNote(guildId.value, value);
  };

  const onNoteKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = `${el.value.slice(0, start)}\t${el.value.slice(end)}`;
    editingNote.value = next;
    requestAnimationFrame(() => {
      el.selectionStart = start + 1;
      el.selectionEnd = start + 1;
    });
  };

  const decrementGuildPlantQuantity = (thingIds: string[]) => {
    if (thingIds.length > 1) {
      garden.removeGuildThings(guildId.value, [thingIds[thingIds.length - 1]!]);
      return;
    }
    if (thingIds.length === 1) {
      garden.removeGuildThings(guildId.value, thingIds);
    }
  };

  const openAddPlantEditor = () => {
    plantEditor.value = { kind: 'add' };
    selectedPick.value = null;
  };

  const openEditPlantEditor = (row: GuildPlantGroupRow) => {
    plantEditor.value = {
      kind: 'edit',
      plantId: row.plantId,
      thingIds: [...row.thingIds],
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

  const phenologySummaryForThingIds = (thingIds: string[]): string | null => {
    if (thingIds.length === 0) {
      return null;
    }
    const id0 = thingIds[0]!;
    const row = guild.value.plants.find((p) => p.id === id0);
    if (!row) {
      return null;
    }
    const rp = garden.resolvedPlant(row.plantId);
    return phenologySummaryForPlant(rp.speciesId, rp.cultivarId);
  };

  const togglePlantGroup = (plantId: string) => {
    expandedPlantGroupId.value = expandedPlantGroupId.value === plantId ? null : plantId;
  };

  const isPlantGroupExpanded = (plantId: string): boolean =>
    expandedPlantGroupId.value === plantId;

  const guildThing = (thingId: string): GardenThing | undefined =>
    guild.value.plants.find((t) => t.id === thingId);

  const setThingGrowthPhase = (thingId: string, raw: string) => {
    const phase = GROWTH_PHASES_FOR_SELECT.find((option) => option === raw);
    if (raw === '' || phase)
      garden.setGuildThingGrowthPhase(guildId.value, thingId, phase ?? '');
  };

  return {
    editingName,
    editingNote,
    displayedName,
    displayedNote,
    plantEditor,
    selectedPick,
    setEditingName,
    commitName,
    setEditingNote,
    commitNote,
    onNoteKeydown,
    decrementGuildPlantQuantity,
    openAddPlantEditor,
    openEditPlantEditor,
    isEditingRow,
    closePlantEditor,
    onConfirmPlant,
    mulchStars,
    phenologySummaryForThingIds,
    togglePlantGroup,
    isPlantGroupExpanded,
    guildThing,
    setThingGrowthPhase,
  };
};
