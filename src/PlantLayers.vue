<script setup lang="ts">
import { computed } from 'vue';
import { GuildLayer } from './useGardenStore';

const props = withDefaults(defineProps<{ value: GuildLayer[] }>(), {
  value: () => [] as GuildLayer[],
});
const emit = defineEmits<{ (e: 'update:value', value: GuildLayer[]): void }>();

const layers = computed(() =>
  Object.values(GuildLayer).map((l) => ({
    value: l,
    checked: props.value.includes(l),
    label: l.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  })),
);

const toggle = (value: GuildLayer) => {
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
    <h3 class="text-slate-800">Guild Layers</h3>
    <div class="gap-2 grid grid-cols-2">
      <label
        v-for="guildLayer in layers"
        :key="guildLayer.value"
        class="inline-flex items-center cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="guildLayer.checked"
          class="sr-only peer"
          @change="toggle(guildLayer.value)"
        />
        <div
          class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
        ></div>
        <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{{
          guildLayer.label
        }}</span>
      </label>
    </div>
  </div>
</template>
