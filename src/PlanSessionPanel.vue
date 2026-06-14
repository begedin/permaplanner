<script setup lang="ts">
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';

  import { exportActiveGardenJson } from './exportGardenJson';
  import PlanSaveIntegrationsList from './PlanSaveIntegrationsList.vue';
  import ToolSlider from './ToolSlider.vue';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useOnboardingStore } from './useOnboardingStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { usePlanEditSession } from './usePlanEditSession';
  import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
  import { useAuthStore } from './stores/useAuthStore';
  import { isAerialRoute, routeNames } from './router';
  import { resetGardenSession } from './useGardenSession';
  import { useRoute } from 'vue-router';

  const permaplannerStore = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  const onboarding = useOnboardingStore();
  const auth = useAuthStore();
  const router = useRouter();
  const route = useRoute();
  const planSaveCoordinator = usePlanSaveCoordinator();

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

  const showAerialMapTools = computed(
    () => Boolean(permaplannerStore.gardenId) && isAerialRoute(route.name),
  );

  const savePlan = async () => {
    await planSaveCoordinator.saveAllLinkedIntegrations();
  };

  const logout = async () => {
    await auth.logout();
    await resetGardenSession();
    await router.replace({ name: routeNames.login });
  };
</script>

<template>
  <div class="flex flex-col items-stretch gap-2">
    <PlanSaveIntegrationsList />
    <template v-if="permaplannerStore.gardenName">
      <span class="text-xs text-ink-600 truncate">{{ permaplannerStore.gardenName }}</span>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
        @click="savePlan"
      >
        Save plan
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
        @click="exportActiveGardenJson"
      >
        Export JSON…
      </button>
    </template>
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
    <RouterLink
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800 text-center"
      :to="{ name: routeNames.import }"
    >
      Import another garden
    </RouterLink>
    <button
      type="button"
      class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
      @click="logout"
    >
      Sign out
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
