<script setup lang="ts">
defineProps<{ x: number; y: number; onboardingState: string }>()
</script>
<template>
  <text :x="x" :y="y" fill="red" text-anchor="middle" dominant-baseline="middle">
    <template v-if="onboardingState === 'initial'">
      Great. You have your plot of land. Now, let's set the scale of the map. Drag one of the two
      red circles to the start of a thing you know the length off.
    </template>
    <template v-if="onboardingState === 'movingFirst'">
      You got it! Try to be as precise as you can with placement.
    </template>

    <template v-if="onboardingState === 'movedFirst'">
      Great! Now go move the other point.
    </template>

    <template v-if="onboardingState === 'movingSecond'"> Getting there... </template>

    <template v-if="onboardingState === 'movedSecond'">
      Awesome! Now, set the length of that line using the slider. The choice of unit is yours. Feet,
      inches, meters, doesn't matter.
    </template>

    <template v-if="onboardingState === 'settingLength'">
      Awesome! Now, set the length of that line using the slider. The choice of unit is yours. Feet,
      inches, meters, doesn't matter.</template
    >
  </text>
</template>
