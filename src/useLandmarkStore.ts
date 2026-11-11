import { computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { cloneGuildPath } from './guildPathClip';
import type { Landmark } from './gardenDocument';

export const useLandmarkStore = defineStore('landmarks', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const landmarks = computed(() => readonly(plan.state.landmarks));
  const save = (landmark: Landmark) => {
    history.runMutation(() => {
      const index = plan.state.landmarks.findIndex((item) => item.id === landmark.id);
      const saved = { ...landmark, path: cloneGuildPath(landmark.path) };
      if (index < 0) plan.state.landmarks.push(saved);
      else plan.state.landmarks[index] = saved;
    });
  };
  const remove = (id: string) => {
    history.runMutation(() => {
      plan.state.landmarks = plan.state.landmarks.filter((item) => item.id !== id);
    });
  };
  return { landmarks, save, remove };
});
