<script setup lang="ts">
  import UiIcon from './uiIcons/UiIcon.vue';
  import { useGardenCalendarStore } from './useGardenCalendarStore';

  const calendar = useGardenCalendarStore();
</script>

<template>
  <button
    type="button"
    class="map-control-button"
    data-map-settings
    aria-controls="garden-calendar"
    :aria-expanded="calendar.open"
    title="Season"
    @click="calendar.open = !calendar.open"
  >
    <UiIcon
      name="calendar"
      class="size-5"
    />
    <span class="sr-only sm:not-sr-only [@container(width<40rem)]:sr-only">Season</span>
  </button>
</template>
