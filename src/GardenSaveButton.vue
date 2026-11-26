<script setup lang="ts">
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import UiIcon from './uiIcons/UiIcon.vue';
  const gardenSession = useGardenSessionStore();
</script>
<template>
  <button
    type="button"
    class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    :disabled="!gardenSession.canSave"
    @click="gardenSession.save()"
  >
    <UiIcon
      name="save"
      class="size-5"
    />
    <span class="sr-only min-[360px]:not-sr-only">
      {{ gardenSession.status === 'saving' ? 'Saving…' : 'Save' }}
    </span>
  </button>
</template>
