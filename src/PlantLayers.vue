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
    <h3 class="text-ink-800">Guild Layers</h3>
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
          class="relative w-11 h-6 bg-parchment-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sage-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-parchment-50 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-parchment-50 after:border-parchment-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sage-500"
        ></div>
        <span class="ms-3 text-sm font-medium text-ink-800">{{ guildLayer.label }}</span>
      </label>
    </div>
  </div>
</template>
