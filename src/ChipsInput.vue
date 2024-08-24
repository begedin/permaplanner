<template>
  <div
    class="flex flex-row flex-wrap gap-1 items-center justify-start"
    @click="() => textbox?.focus"
    @focusin="() => textbox?.focus"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="flex flex-row gap-1 max-w-full"
    >
      <slot
        :item="item"
        :index="index"
        name="item"
      />
    </div>

    <input
      ref="textbox"
      :value="value"
      contenteditable="plaintext-only"
      class="w-auto min-w-[30px] flex-1 bg-transparent border-none outline-none resize-none text-start"
      @change="onChange"
      @input="onInput"
      @keyup.enter.stop.prevent="onSubmit"
      @keyup.backspace="onBackspace"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import { ref } from 'vue';

defineProps<{ items: T[] }>();

const emit = defineEmits<{
  (e: 'input' | 'change' | 'submit', value: string): void;
  (e: 'delete-last'): void;
}>();

const value = ref('');

const textbox = ref<HTMLInputElement | null>(null);

const onChange = () => {
  value.value = textbox.value?.value || '';
  emit('change', textbox.value?.value || '');
};

const onInput = () => {
  value.value = textbox.value?.value || '';
  emit('input', textbox.value?.value || '');
};

const onSubmit = () => {
  console.log('onsubmit');
  emit('submit', textbox.value?.value || '');
  value.value = '';
};

const onBackspace = (e: KeyboardEvent) => {
  console.log('onBackspace', value.value);
  if (value.value === '') {
    emit('delete-last');
    e.preventDefault();
    e.stopPropagation();
  }
};
</script>
