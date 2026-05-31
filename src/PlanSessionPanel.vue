<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';

  import GithubRepoSyncPanel from './GithubRepoSyncPanel.vue';
  import PlanUnsavedIndicator from './PlanUnsavedIndicator.vue';
  import ToolSlider from './ToolSlider.vue';
  import { isGithubStorageLinked } from './githubRepoSync';
  import { useMapScaleStore } from './useMapScaleStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { usePlanSession } from './usePlanSession';
  import { isAerialRoute } from './router';

  const permaplannerStore = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  const route = useRoute();

  const { load, newPlan, save, saveAs } = usePlanSession();

  const showLocalFileActions = computed(() => Boolean(permaplannerStore.fileName));
  const showGithubOnlyHint = computed(
    () => !permaplannerStore.fileName && isGithubStorageLinked(),
  );
  const showAerialMapTools = computed(
    () => showLocalFileActions.value && isAerialRoute(route.name),
  );
</script>

<template>
  <div class="flex flex-col items-stretch gap-2">
    <PlanUnsavedIndicator />
    <p
      v-if="showGithubOnlyHint"
      class="text-xs text-ink-600"
    >
      Plan backed up on GitHub. Use <strong>Open plan</strong> to also save a copy on this
      device.
    </p>
    <template v-if="showAerialMapTools">
      <ToolSlider
        v-model:value="mapScale.linePhysicalLength"
        label="Map scale"
        :min="1"
        :max="300"
        :step="1"
      />
      <ToolSlider
        v-model:value="permaplannerStore.backgroundOpacity"
        label="BG opacity"
        :min="0"
        :max="1"
        :step="0.01"
      />
    </template>
    <template v-if="showLocalFileActions">
      <span class="text-xs text-ink-600 truncate">{{ permaplannerStore.fileName }}</span>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
        @click="save"
      >
        Save plan
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
        @click="saveAs"
      >
        Save as…
      </button>
    </template>
    <button
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="load"
    >
      Open plan
    </button>
    <button
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="newPlan"
    >
      New plan
    </button>
    <GithubRepoSyncPanel />
  </div>
</template>
