<script setup lang="ts">
import { computed } from 'vue';
import { GuildFunction } from './useGardenStore';

const props = defineProps<{ value: GuildFunction[] }>();
const emit = defineEmits<{ (e: 'update:value', value: GuildFunction[]): void }>();

const functions = computed(() =>
  Object.values(GuildFunction).map((f) => ({
    value: f,
    checked: props.value.includes(f),
    label: f.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  })),
);

const toggle = (value: GuildFunction) => {
  const newValues = [...props.value];
  if (newValues.includes(value)) {
    newValues.splice(newValues.indexOf(value), 1);
  } else {
    newValues.push(value);
  }
  emit('update:value', newValues);
};
</script>

<template>
  <div>
    <h3 class="text-slate-800">Functions</h3>
    <div class="gap-2 grid grid-cols-2">
      <label
        v-for="guildFunction in functions"
        :key="guildFunction.value"
        class="inline-flex items-center cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="guildFunction.checked"
          class="sr-only peer"
          @change="toggle(guildFunction.value)"
        />
        <div
          class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
        ></div>
        <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{{
          guildFunction.label
        }}</span>
      </label>
    </div>
  </div>
</template>
