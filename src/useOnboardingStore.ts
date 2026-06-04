import { defineStore, storeToRefs } from 'pinia';

import { advanceOnboardingState, type OnboardingState } from './onboardingTypes';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const useOnboardingStore = defineStore('onboarding', () => {
  const permaplannerStore = usePermaplannerStore();
  const { onboardingState } = storeToRefs(permaplannerStore);
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
    onboardingState,
    advanceOnboarding,
    setOnboardingState,
  };
});
