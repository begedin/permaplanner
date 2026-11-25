import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGardenCalendarStore = defineStore('gardenCalendar', () => {
  const open = ref(false);
  return { open };
});
