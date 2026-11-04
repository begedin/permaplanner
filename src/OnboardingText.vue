<script setup lang="ts">
  import { ref, watch } from 'vue';
  import type { OnboardingState } from './onboardingTypes';

  const props = defineProps<{ x: number; y: number; onboardingState: OnboardingState }>();
  const showCompletion = ref(false);

  watch(
    () => props.onboardingState,
    (state, _previous, onCleanup) => {
      showCompletion.value = state === 'done';
      if (!showCompletion.value) return;
      const timer = setTimeout(() => {
        showCompletion.value = false;
      }, 1000);
      onCleanup(() => clearTimeout(timer));
    },
  );
</script>
<template>
  <text
    v-if="onboardingState !== 'done' || showCompletion"
    :x="x"
    :y="y"
    fill="red"
    text-anchor="middle"
    dominant-baseline="middle"
    data-onboarding-text
  >
    <template v-if="onboardingState === 'initial'">
      Great. You have your plot of land. Now, let's set the scale of the map. Drag one of
      the two red circles to the start of a thing you know the length off.
    </template>
    <template v-if="onboardingState === 'movingFirst'">
      You got it! Try to be as precise as you can with placement.
    </template>

    <template v-if="onboardingState === 'movedFirst'">
      Great! Now go move the other point.
    </template>

    <template v-if="onboardingState === 'movingSecond'"> Getting there... </template>

    <template
      v-if="onboardingState === 'movedSecond' || onboardingState === 'settingLength'"
    >
      Awesome! Now, set the length of that line using the slider. The choice of unit is
      yours. Feet, inches, meters, doesn't matter.
    </template>
    <template v-if="onboardingState === 'done'"
      >Map scale set. You're ready to plan.</template
    >
  </text>
</template>
