import { defineStore } from 'pinia';
import { computed, readonly, toRefs } from 'vue';
import { uuid } from './utils';
import { usePlanStateStore } from './usePlanStateStore';
import { withPersistedGuildPlantLabels } from './guildPlantLabels';
import {
  hasPlantPlacement,
  type Guild,
  type MulchLevel,
  type Plant,
  type UserPlant,
} from './gardenTypes';
import type { GrowthPhase, PlantVigor } from './guildPlantInstanceStatus';
import { plantCatalog } from './plantCatalog';
import { confirmGuildDeletion } from './confirmGuildDeletion';
import { pathBounds } from './guildPathBounds';
import { cloneGuildPath, joinPaths, type GuildPath } from './guildPathClip';
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

export const useGardenStore = defineStore('garden', () => {
  const plan = usePlanStateStore();
  const { plants, guilds } = toRefs(plan.state);
  const commandHistory = usePlanCommandHistory();
  const { clearHoverIf } = useGuildHover();

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

  const removeGuildWithoutConfirm = (id: string) => {
    guilds.value = guilds.value.filter((g) => g.id !== id);
    clearHoverIf(id);
  };

  const createGuild = () => {
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
    return readonly(created);
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

  const setGuildPath = (guildId: string, path: GuildPath, movePlants = false) => {
    commandHistory.runMutation(() => {
      const guild = guilds.value.find((g) => g.id === guildId);
      if (!guild) {
        return;
      }
      if (movePlants && guild.path.length && path.length) {
        const before = pathBounds(guild.path.flat(2));
        const after = pathBounds(path.flat(2));
        for (const thing of guild.plants.filter(hasPlantPlacement)) {
          thing.x += after.x - before.x;
          thing.y += after.y - before.y;
        }
      }
      guild.path = cloneGuildPath(path);
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
    const rp = resolvedPlant(plantId);

    guild.plants.push({
      id: uuid(),
      plantId,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      placed: false,
      nameOrCultivar: plantDisplayLabel(rp),
    });
  };

  const addPlantToGuild = (guildId: string, plantId: string) => {
    commandHistory.runMutation(() => {
      pushPlantThingOntoGuild(guildId, plantId);
    });
  };

  const setPlantPlacement = (guildId: string, thingId: string, bounds: Bounds) => {
    const thing = guilds.value
      .find((guild) => guild.id === guildId)
      ?.plants.find((plant) => plant.id === thingId);
    if (
      !thing ||
      !Object.values(bounds).every(Number.isFinite) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    )
      return;
    commandHistory.runMutation(() => {
      Object.assign(thing, bounds, { placed: true });
    });
  };

  const removePlantPlacement = (guildId: string, thingId: string) => {
    commandHistory.runMutation(() => {
      const thing = guilds.value
        .find((g) => g.id === guildId)
        ?.plants.find((t) => t.id === thingId);
      if (thing) Object.assign(thing, { x: 0, y: 0, width: 0, height: 0, placed: false });
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

  const updateGuildThingNote = (guildId: string, thingId: string, note: string) => {
    commandHistory.runMutation(() => {
      const thing = guilds.value
        .find((g) => g.id === guildId)
        ?.plants.find((p) => p.id === thingId);
      if (!thing) return;
      if (note.trim() === '') delete thing.note;
      else thing.note = note;
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

  const plantIsUsed = (plantId: string) =>
    guilds.value.some((guild) => guild.plants.some((thing) => thing.plantId === plantId));

  const removePlant = (plantId: string): boolean => {
    if (plantIsUsed(plantId)) return false;
    commandHistory.runMutation(() => {
      plants.value = plants.value.filter((plant) => plant.id !== plantId);
    });
    return true;
  };

  const savePlant = (plant: UserPlant) => {
    commandHistory.runMutation(() => {
      const saved: UserPlant = JSON.parse(JSON.stringify(plant));
      const index = plants.value.findIndex((item) => item.id === saved.id);
      if (index < 0) plants.value.push(saved);
      else plants.value[index] = saved;
      guilds.value = withPersistedGuildPlantLabels(plan.state).guilds;
    });
  };

  return {
    plants: computed(() => readonly(plants.value)),
    savePlant,
    plantIsUsed,
    removePlant,
    plantsById,
    resolvedPlant,
    guilds: computed(() => readonly(guilds.value)),

    mergeGuilds,
    removeGuild,
    removeGuildFromAerialMap,
    setGuildPath,
    createGuild,

    setPlantPlacement,
    removePlantPlacement,
    addPlantToGuild,
    addCatalogPlantToGuild,
    replaceGuildThingsWithCatalogPlant,
    updateGuildName,
    updateGuildNote,
    updateGuildThingNote,
    setGuildMulchLevel,
    removeGuildThings,
    setGuildThingGrowthPhase,
    setGuildThingVigor,
  };
});
