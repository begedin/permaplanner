import { defineStore } from 'pinia';

import { advanceOnboardingState, type OnboardingState } from './onboardingTypes';
import { usePlanStateStore } from './usePlanStateStore';
import { computed, toRefs } from 'vue';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const useOnboardingStore = defineStore('onboarding', () => {
  const plan = usePlanStateStore();
  const { onboardingState } = toRefs(plan.state);
  const commandHistory = usePlanCommandHistory();

  const advanceOnboarding = () => {
    commandHistory.runMutation(() => {
      onboardingState.value = advanceOnboardingState(onboardingState.value);
    });
  };

  const setOnboardingState = (state: OnboardingState) => {
    commandHistory.runMutation(() => {
      onboardingState.value = state;
    });
  };

  return {
    onboardingState: computed(() => onboardingState.value),
    advanceOnboarding,
    setOnboardingState,
  };
});
