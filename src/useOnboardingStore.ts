import { defineStore, storeToRefs } from 'pinia';

import { advanceOnboardingState } from './onboardingTypes';
import { usePermaplannerStore } from './usePermaplannerStore';

export const useOnboardingStore = defineStore('onboarding', () => {
  const permaplannerStore = usePermaplannerStore();
  const { onboardingState } = storeToRefs(permaplannerStore);

  const advanceOnboarding = () => {
    onboardingState.value = advanceOnboardingState(onboardingState.value);
  };

  return {
    onboardingState,
    advanceOnboarding,
  };
});
