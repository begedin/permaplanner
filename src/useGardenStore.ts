import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { uuid } from './utils';
import { usePermaplannerStore } from './usePermaplannerStore';
import type { Guild, MulchLevel, Plant } from './gardenTypes';
import type { GrowthPhase, PlantVigor } from './guildPlantInstanceStatus';
import { plantCatalog } from './plantCatalog';
import { confirmGuildDeletion } from './confirmGuildDeletion';
import { pathBounds } from './guildPathBounds';
import { joinPaths, type PathPoint } from './guildPathClip';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';
import { useGuildHover } from './useGuildHover';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const FALLBACK_PLANT: Plant = {
  id: '__fallback__',
  speciesId: 'unknown',
  cultivarId: null,
  name: 'Plant',
  cultivar: null,
  iconId: 'seedling',
  functions: [],
  layers: [],
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_PLACEMENT_BOUNDS: Bounds = { x: 0, y: 0, width: 64, height: 64 };

export const useGardenStore = defineStore('garden', () => {
  const permaplanner = usePermaplannerStore();
  const { plants, guilds } = storeToRefs(permaplanner);
  const commandHistory = usePlanCommandHistory();
  const { clearHoverIf } = useGuildHover();

  const mergeSourceId = ref<string>();
  watch(
    [
      () => permaplanner.gardenId,
      () => guilds.value.some((g) => g.id === mergeSourceId.value),
    ],
    ([gardenId, sourceExists], [previousGardenId]) => {
      if (gardenId !== previousGardenId || !sourceExists) {
        mergeSourceId.value = undefined;
      }
    },
  );

  const mergeGuilds = (sourceId: string, targetId: string): boolean => {
    const source = guilds.value.find((g) => g.id === sourceId);
    const target = guilds.value.find((g) => g.id === targetId);
    if (!source || !target || sourceId === targetId) {
      return false;
    }
    const path = joinPaths(source.path, target.path);
    commandHistory.runMutation(() => {
      source.name = `${source.name} + ${target.name}`;
      const note = [source.note, target.note].filter(Boolean).join(' + ');
      if (note) source.note = note;
      source.path = path;
      source.plants.push(...target.plants);
      removeGuildWithoutConfirm(targetId);
    });
    mergeSourceId.value = undefined;
    return true;
  };

  const plantsById = computed(() => {
    const m: Record<string, Plant> = {};
    for (const up of plants.value) {
      m[up.id] = resolveUserPlant(up, plantCatalog);
    }
    return m;
  });

  const resolvedPlant = (id: string): Plant => plantsById.value[id] ?? FALLBACK_PLANT;

  const guildBoundsById = computed(() =>
    Object.fromEntries(
      guilds.value
        .filter((g) => g.path.length > 0)
        .map((guild) => [guild.id, pathBounds(guild.path)]),
    ),
  );

  const removeGuildWithoutConfirm = (id: string) => {
    guilds.value = guilds.value.filter((g) => g.id !== id);
    clearHoverIf(id);
  };

  const createGuild = (): Guild => {
    let created!: Guild;
    commandHistory.runMutation(() => {
      created = {
        id: uuid(),
        name: 'New guild',
        path: [],
        plants: [],
        mulchLevel: 1,
      };
      guilds.value.push(created);
    });
    return created;
  };

  const removeGuild = (id: string) => {
    const guild = guilds.value.find((g) => g.id === id);
    if (!guild || !confirmGuildDeletion(guild.name)) {
      return;
    }
    commandHistory.runMutation(() => removeGuildWithoutConfirm(id));
  };

  /** Clears the guild bed on the aerial map; keeps the guild and its plants. */
  const removeGuildFromAerialMap = (id: string) => {
    commandHistory.runMutation(() => {
      const g = guilds.value.find((guild) => guild.id === id);
      if (g) {
        g.path = [];
      }
    });
  };

  const setGuildPath = (guildId: string, path: PathPoint[]) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (!guild) {
        return;
      }
      guild.path = path;
    });
  };

  const findOrCreateUserPlantId = (
    speciesId: string,
    cultivarId: string | null,
  ): string => {
    const existing = plants.value.find(
      (pl) => pl.speciesId === speciesId && (pl.cultivarId ?? null) === cultivarId,
    );
    if (existing) {
      return existing.id;
    }
    const id = uuid();
    plants.value.push({ id, speciesId, cultivarId });
    return id;
  };

  const pushPlantThingOntoGuild = (guildId: string, plantId: string) => {
    const guild = guilds.value.find((g) => g.id === guildId);
    if (!guild) {
      return;
    }
    const bounds = guildBoundsById.value[guildId] ?? DEFAULT_PLACEMENT_BOUNDS;
    const rp = resolvedPlant(plantId);

    guild.plants.push({
      id: uuid(),
      plantId,
      x: bounds.x + 5,
      y: bounds.y + 5,
      width: 16,
      height: 16,
      nameOrCultivar: plantDisplayLabel(rp),
    });
  };

  const addPlantToGuild = (guildId: string, plantId: string) => {
    commandHistory.runMutation(() => {
      pushPlantThingOntoGuild(guildId, plantId);
    });
  };

  const updateGuildName = (guildId: string, name: string) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (guild) {
        guild.name = name;
      }
    });
  };

  const updateGuildNote = (guildId: string, note: string) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (!guild) {
        return;
      }
      if (note === '') {
        delete guild.note;
      } else {
        guild.note = note;
      }
    });
  };

  const setGuildMulchLevel = (guildId: string, level: MulchLevel) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (guild) {
        guild.mulchLevel = level;
      }
    });
  };

  const removeGuildThings = (guildId: string, thingIds: string[]) => {
    if (thingIds.length === 0) {
      return;
    }
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (!guild) {
        return;
      }
      const idSet = new Set(thingIds);
      for (let i = guild.plants.length - 1; i >= 0; i--) {
        if (idSet.has(guild.plants[i]!.id)) {
          guild.plants.splice(i, 1);
        }
      }
    });
  };

  const setGuildThingGrowthPhase = (
    guildId: string,
    thingId: string,
    phase: GrowthPhase | '',
  ) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      const thing = guild?.plants.find((t) => t.id === thingId);
      if (!thing) {
        return;
      }
      if (phase === '') {
        delete thing.growthPhase;
      } else {
        thing.growthPhase = phase;
      }
    });
  };

  const setGuildThingVigor = (
    guildId: string,
    thingId: string,
    vigor: PlantVigor | undefined,
  ) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      const thing = guild?.plants.find((t) => t.id === thingId);
      if (!thing) {
        return;
      }
      if (vigor === undefined) {
        delete thing.vigor;
      } else {
        thing.vigor = vigor;
      }
    });
  };

  const addCatalogPlantToGuild = (
    guildId: string,
    speciesId: string,
    cultivarId: string | null,
  ) => {
    commandHistory.runMutation(() => {
      const plantId = findOrCreateUserPlantId(speciesId, cultivarId);
      pushPlantThingOntoGuild(guildId, plantId);
    });
  };

  const replaceGuildThingsWithCatalogPlant = (
    guildId: string,
    thingIds: string[],
    speciesId: string,
    cultivarId: string | null,
  ) => {
    commandHistory.runMutation(() => {
      const plantId = findOrCreateUserPlantId(speciesId, cultivarId);
      const guild = guilds.value.find((g) => g.id === guildId);
      if (!guild) {
        return;
      }
      const label = plantDisplayLabel(resolvedPlant(plantId));
      for (const thingId of thingIds) {
        const thing = guild.plants.find((t) => t.id === thingId);
        if (thing) {
          thing.plantId = plantId;
          thing.nameOrCultivar = label;
        }
      }
    });
  };

  return {
    plants,
    plantsById,
    resolvedPlant,
    guilds,

    mergeSourceId,
    mergeGuilds,
    removeGuild,
    removeGuildFromAerialMap,
    setGuildPath,
    createGuild,

    addPlantToGuild,
    addCatalogPlantToGuild,
    replaceGuildThingsWithCatalogPlant,
    updateGuildName,
    updateGuildNote,
    setGuildMulchLevel,
    removeGuildThings,
    setGuildThingGrowthPhase,
    setGuildThingVigor,
  };
});
