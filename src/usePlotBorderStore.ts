import { computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { cloneGuildPath, joinPaths, type GuildPath } from './guildPathClip';

export const usePlotBorderStore = defineStore('plotBorder', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const path = computed(() => readonly(plan.state.plotBorder));
  const savePath = (path: GuildPath): boolean => {
    if (path.flat(2).some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y)))
      return false;
    const normalized = joinPaths([], path);
    if (path.length && !normalized.length) return false;
    history.runMutation(() => {
      plan.state.plotBorder = cloneGuildPath(normalized);
    });
    return true;
  };
  return { path, savePath };
});
