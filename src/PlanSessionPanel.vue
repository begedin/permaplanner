<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useRoute } from 'vue-router';

  import GithubPlanPickerDialog from './GithubPlanPickerDialog.vue';
  import PlanSaveIntegrationsList from './PlanSaveIntegrationsList.vue';
  import ToolSlider from './ToolSlider.vue';
  import { isGithubStorageLinked, readGithubClientIdConfig } from './githubRepoSync';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useOnboardingStore } from './useOnboardingStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { usePlanEditSession } from './usePlanEditSession';
  import { usePlanSession } from './usePlanSession';
  import { isAerialRoute, routeNames } from './router';

  const permaplannerStore = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  const onboarding = useOnboardingStore();
  const mapScaleEditSession = usePlanEditSession();
  const backgroundOpacityEditSession = usePlanEditSession();

  let mapScaleOnboardingTimer: ReturnType<typeof setTimeout> | undefined;

  const finishMapScaleEdit = () => {
    mapScaleEditSession.commit();
    if (mapScale.linePhysicalLength === 1) {
      return;
    }
    onboarding.onboardingState = 'settingLength';
    if (mapScaleOnboardingTimer !== undefined) {
      clearTimeout(mapScaleOnboardingTimer);
    }
    mapScaleOnboardingTimer = setTimeout(() => {
      onboarding.onboardingState = 'done';
      mapScaleOnboardingTimer = undefined;
    }, 1000);
  };
  const route = useRoute();

  const { load, newPlan, save } = usePlanSession();

  const githubPickerOpen = ref(false);
  const showOpenFromGithub = computed(
    () => Boolean(readGithubClientIdConfig()) && isGithubStorageLinked(),
  );
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
    <PlanSaveIntegrationsList />
    <p
      v-if="showGithubOnlyHint"
      class="text-xs text-ink-600"
    >
      No local plan file yet. Use <strong>Open from GitHub…</strong> to load a backed-up
      garden, or <strong>Open plan</strong> for a file on this device.
    </p>
    <template v-if="showAerialMapTools">
      <ToolSlider
        :value="mapScale.linePhysicalLength"
        label="Map scale"
        :min="1"
        :max="300"
        :step="1"
        @edit-start="mapScaleEditSession.begin"
        @update:value="mapScale.linePhysicalLength = $event"
        @commit:value="finishMapScaleEdit"
      />
      <ToolSlider
        :value="permaplannerStore.backgroundOpacity"
        label="BG opacity"
        :min="0"
        :max="1"
        :step="0.01"
        @edit-start="backgroundOpacityEditSession.begin"
        @update:value="permaplannerStore.backgroundOpacity = $event"
        @commit:value="
          () => {
            backgroundOpacityEditSession.commit();
          }
        "
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
    </template>
    <button
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="load"
    >
      Open plan
    </button>
    <button
      v-if="showOpenFromGithub"
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="githubPickerOpen = true"
    >
      Open from GitHub…
    </button>
    <GithubPlanPickerDialog v-model:open="githubPickerOpen" />
    <button
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="newPlan"
    >
      New plan
    </button>
    <p class="pt-1 text-center text-[11px] text-ink-500">
      <RouterLink
        class="underline decoration-parchment-400 underline-offset-2 hover:text-ink-700"
        :to="{ name: routeNames.privacy }"
      >
        Privacy
      </RouterLink>
    </p>
  </div>
</template>
