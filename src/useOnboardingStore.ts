import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const useOnboardingStore = defineStore('onboarding', () => {
  const onboardingSteps = [
    'initial',
    'movingFirst',
    'movedFirst',
    'movingSecond',
    'movedSecond',
    'settingLength',
    'done',
  ] as const;

  const onboardingState = useStorage<
    | 'initial'
    | 'movingFirst'
    | 'movedFirst'
    | 'movingSecond'
    | 'movedSecond'
    | 'settingLength'
    | 'done'
  >('onboardingState', 'initial');

  const advanceOnboarding = () => {
    const currentIndex = onboardingSteps.indexOf(onboardingState.value);
    onboardingState.value = onboardingSteps[currentIndex + 1] || 'done';
  };

  return {
    onboardingState,
    advanceOnboarding,
  };
});
