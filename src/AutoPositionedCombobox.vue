<script setup lang="ts" generic="T extends string | number | boolean | object | null">
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOptions,
} from '@headlessui/vue';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

type PopoverListbox = HTMLElement & {
  showPopover: (options?: { source?: Element }) => void;
  hidePopover: () => void;
};

const props = withDefaults(
  defineProps<{
    modelValue: T;
    by?: string | ((a: unknown, b: unknown) => boolean);
    nullable?: boolean;
    disabled?: boolean;
    multiple?: boolean;
  }>(),
  {
    by: undefined,
    nullable: false,
    disabled: false,
    multiple: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: T];
}>();

const selected = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v as T),
});

const anchorRef = ref<HTMLElement | null>(null);
const optionsPanelRef = ref<{ $el?: HTMLElement; el?: HTMLElement } | null>(null);

const panelOpen = ref(false);

const syncPanelOpen = (open: boolean): string => {
  if (panelOpen.value !== open) {
    panelOpen.value = open;
  }
  return '';
};

const optionsEl = (): PopoverListbox | null => {
  const el = optionsPanelRef.value?.$el ?? optionsPanelRef.value?.el ?? null;
  return el ? (el as PopoverListbox) : null;
};

const syncPopover = async (open: boolean) => {
  await nextTick();
  const panel = optionsEl();
  const anchor = anchorRef.value;
  if (!panel || !anchor) {
    return;
  }
  if (!open) {
    if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    return;
  }
  panel.showPopover({ source: anchor });
};

watch(panelOpen, (open) => {
  void syncPopover(open);
});

onUnmounted(() => {
  const panel = optionsEl();
  if (panel?.matches(':popover-open')) {
    panel.hidePopover();
  }
});
</script>

<template>
  <Combobox
    v-slot="{ open }"
    v-model="selected"
    as="div"
    class="relative w-full"
    :by="by"
    :nullable="nullable"
    :disabled="disabled"
    :multiple="multiple"
  >
    <span
      class="hidden"
      aria-hidden="true"
    >{{ syncPanelOpen(open) }}</span>
    <ComboboxLabel
      v-if="$slots.label"
      class="sr-only"
    >
      <slot name="label" />
    </ComboboxLabel>
    <div
      ref="anchorRef"
      class="relative w-full"
    >
      <slot name="anchor">
        <ComboboxInput />
        <ComboboxButton />
      </slot>
    </div>
    <ComboboxOptions
      ref="optionsPanelRef"
      as="div"
      static
      :unmount="false"
      popover="manual"
      class="combobox-options-popover z-20 max-h-60 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
    >
      <slot name="options" />
    </ComboboxOptions>
  </Combobox>
</template>

<style scoped>
.combobox-options-popover {
  margin: unset;
  inset: unset;
  width: anchor-size(inline);
  position-area: block-end;
  position-try-fallbacks: flip-block;
}
</style>
