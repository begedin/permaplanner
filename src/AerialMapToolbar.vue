<script setup lang="ts">
  import { computed } from 'vue';

  import UiIcon from './uiIcons/UiIcon.vue';
  import type { AerialTool } from './useAerialTool';
  import type { UiIconId } from './uiIcons/iconIds';

  const props = defineProps<{
    activeTool: AerialTool;
    canUseGuildTools: boolean;
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
        disabled: !props.canUseGuildTools,
      },
      {
        id: 'landmark',
        label: 'Draw landmark',
        hotkey: 'R',
        icon: 'rectangle',
        disabled: false,
      },
      {
        id: 'border',
        label: 'Plot border',
        hotkey: 'P',
        icon: 'polygon',
        disabled: false,
      },
      {
        id: 'move',
        label: 'Move guild',
        hotkey: 'M',
        icon: 'move',
        disabled: !props.canUseGuildTools,
      },
    ],
  );
</script>

<template>
  <div
    role="toolbar"
    aria-label="Map tools"
    class="map-toolbar paper-floating pointer-events-auto flex gap-1 p-1.5"
  >
    <button
      v-for="tool in tools"
      :key="tool.id"
      type="button"
      class="nav-icon-btn"
      :class="{ 'nav-icon-btn-active': activeTool === tool.id }"
      :aria-label="`${tool.label} (${tool.hotkey})`"
      :title="`${tool.label} (${tool.hotkey})`"
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
