<script setup lang="ts">
  import { computed } from 'vue';

  import UiIcon from './uiIcons/UiIcon.vue';
  import type { AerialTool } from './useAerialTool';
  import type { UiIconId } from './uiIcons/iconIds';

  const props = defineProps<{
    activeTool: AerialTool;
    canUseEdit: boolean;
    canUseMove: boolean;
  }>();

  const emit = defineEmits<{
    'update:activeTool': [tool: AerialTool];
  }>();

  const tools = computed(
    (): {
      id: AerialTool;
      label: string;
      hotkey: string;
      icon: UiIconId;
      disabled: boolean;
    }[] => [
      {
        id: 'select',
        label: 'Select',
        hotkey: 'V',
        icon: 'pointer',
        disabled: false,
      },
      {
        id: 'edit',
        label: 'Edit brush',
        hotkey: 'B',
        icon: 'edit',
        disabled: !props.canUseEdit,
      },
      {
        id: 'move',
        label: 'Move guild',
        hotkey: 'M',
        icon: 'move',
        disabled: !props.canUseMove,
      },
    ],
  );
</script>

<template>
  <div
    role="toolbar"
    aria-label="Map tools"
    class="pointer-events-auto flex gap-0.5 rounded-lg border border-parchment-400/60 bg-parchment-100/95 p-1 shadow-parchment paper-surface"
  >
    <button
      v-for="tool in tools"
      :key="tool.id"
      type="button"
      class="nav-icon-btn"
      :class="{ 'nav-icon-btn-active': activeTool === tool.id }"
      :aria-label="`${tool.label} (${tool.hotkey})`"
      :aria-pressed="activeTool === tool.id"
      :disabled="tool.disabled"
      @click="emit('update:activeTool', tool.id)"
    >
      <UiIcon
        :name="tool.icon"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
