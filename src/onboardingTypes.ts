export const ONBOARDING_STEPS = [
  'initial',
  'movingFirst',
  'movedFirst',
  'movingSecond',
  'movedSecond',
  'settingLength',
  'done',
] as const;

export type OnboardingState = (typeof ONBOARDING_STEPS)[number];

export const DEFAULT_ONBOARDING_STATE: OnboardingState = 'initial';

export const advanceOnboardingState = (current: OnboardingState): OnboardingState => {
  const index = ONBOARDING_STEPS.indexOf(current);
  return ONBOARDING_STEPS[index + 1] ?? 'done';
};
