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

const onboardingStateSet = new Set<string>(ONBOARDING_STEPS);

export const isOnboardingState = (value: string): value is OnboardingState =>
  onboardingStateSet.has(value);

/** Existing plans without the field are treated as already onboarded. */
export const ONBOARDING_STATE_AFTER_PLAN_MIGRATION: OnboardingState = 'done';

export const normalizeOnboardingState = (raw: unknown): OnboardingState => {
  if (typeof raw === 'string' && isOnboardingState(raw)) {
    return raw;
  }
  return ONBOARDING_STATE_AFTER_PLAN_MIGRATION;
};

export const advanceOnboardingState = (current: OnboardingState): OnboardingState => {
  const index = ONBOARDING_STEPS.indexOf(current);
  return ONBOARDING_STEPS[index + 1] ?? 'done';
};
