<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue';
  import UiIcon from './uiIcons/UiIcon.vue';

  const props = defineProps<{ note?: string; label: string; readOnly?: boolean }>();
  const emit = defineEmits<{ 'update:note': [note: string] }>();
  const editing = defineModel<boolean>('editing', { default: false });
  const draft = ref('');
  const textarea = ref<HTMLTextAreaElement | null>(null);

  watch(
    editing,
    async (value) => {
      if (!value) return;
      draft.value = props.note ?? '';
      await nextTick();
      textarea.value?.focus();
    },
    { immediate: true },
  );

  const save = () => {
    if (!editing.value) return;
    editing.value = false;
    emit('update:note', draft.value.trim() ? draft.value : '');
  };
</script>

<template>
  <textarea
    v-if="editing"
    ref="textarea"
    v-model="draft"
    :aria-label="`Note for ${label}`"
    placeholder="Notes for this plant…"
    rows="2"
    class="w-full rounded-md border border-parchment-400 bg-white px-2 py-1 text-sm text-ink-700"
    @blur="save"
    @keydown.escape.stop.prevent="editing = false"
  />
  <p
    v-else-if="note && readOnly"
    class="whitespace-pre-wrap break-words text-xs text-ink-600"
  >
    {{ note }}
  </p>
  <button
    v-else-if="note"
    type="button"
    :aria-label="`Edit note for ${label}`"
    :title="`Edit note for ${label}`"
    class="flex items-start gap-1 self-start text-left text-xs text-ink-600 hover:text-ink-900"
    @click.stop="editing = true"
  >
    <UiIcon
      name="edit"
      class="size-4 shrink-0"
    />
    <span class="whitespace-pre-wrap break-words min-w-0">{{ note }}</span>
  </button>
</template>
