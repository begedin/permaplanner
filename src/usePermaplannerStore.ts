import { defineStore } from 'pinia';
import { computed, readonly } from 'vue';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

/** Read-only plan views and background-image editing actions. */
export const usePermaplannerStore = defineStore('permaplanner', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();

  const setBackgroundImage = (value: string | undefined) => {
    history.runMutation(() => {
      plan.state.backgroundImageDataUrl = value;
    });
  };
  const setBackgroundOpacity = (value: number, token?: symbol) => {
    history.runMutation(() => {
      plan.state.backgroundOpacity = value;
    }, token);
  };

  return {
    plants: computed(() => readonly(plan.state.plants)),
    guilds: computed(() => readonly(plan.state.guilds)),
    landmarks: computed(() => readonly(plan.state.landmarks)),
    plotBorder: computed(() => readonly(plan.state.plotBorder)),
    backgroundOpacity: computed(() => plan.state.backgroundOpacity),
    backgroundImageDataUrl: computed(() => plan.state.backgroundImageDataUrl),
    onboardingState: computed(() => plan.state.onboardingState),
    setBackgroundImage,
    setBackgroundOpacity,
  };
});
