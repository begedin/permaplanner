<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useRouter } from 'vue-router';

  import {
    createGardenShare,
    listGardenShares,
    revokeGardenShare,
    type GardenShare,
  } from './api/gardenShares';
  import { exportActiveGardenJson } from './exportGardenJson';
  import PlanSaveStatus from './PlanSaveStatus.vue';
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

  const shares = ref<GardenShare[]>([]);
  const shareError = ref<string | undefined>();
  const sharing = ref(false);
  const revokingShareId = ref<string | undefined>();

  const formatShareDate = (iso: string): string => new Date(iso).toLocaleString();

  const absoluteShareUrl = (path: string): string =>
    new URL(path, window.location.origin).href;

  const loadShares = async () => {
    const gardenId = permaplannerStore.gardenId;
    if (!gardenId) {
      shares.value = [];
      return;
    }
    shareError.value = undefined;
    try {
      shares.value = await listGardenShares(gardenId);
    } catch (e) {
      shareError.value = e instanceof Error ? e.message : String(e);
      shares.value = [];
    }
  };

  watch(() => permaplannerStore.gardenId, loadShares, { immediate: true });

  const generateShareLink = async () => {
    const gardenId = permaplannerStore.gardenId;
    if (!gardenId) {
      return;
    }
    sharing.value = true;
    shareError.value = undefined;
    try {
      const share = await createGardenShare(gardenId);
      shares.value = [share, ...shares.value.filter((row) => row.id !== share.id)];
    } catch (e) {
      shareError.value = e instanceof Error ? e.message : String(e);
    } finally {
      sharing.value = false;
    }
  };

  const revokeShare = async (shareId: string) => {
    const gardenId = permaplannerStore.gardenId;
    if (!gardenId) {
      return;
    }
    revokingShareId.value = shareId;
    shareError.value = undefined;
    try {
      await revokeGardenShare(gardenId, shareId);
      shares.value = shares.value.filter((share) => share.id !== shareId);
    } catch (e) {
      shareError.value = e instanceof Error ? e.message : String(e);
    } finally {
      revokingShareId.value = undefined;
    }
  };

  const savePlan = async () => {
    await planSaveCoordinator.saveNow();
  };

  const logout = async () => {
    await auth.logout();
    await resetGardenSession();
    await router.replace({ name: routeNames.login });
  };
</script>

<template>
  <div class="flex flex-col items-stretch gap-2">
    <PlanSaveStatus />
    <template v-if="permaplannerStore.gardenName">
      <span class="text-xs text-ink-600 truncate">{{
        permaplannerStore.gardenName
      }}</span>
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
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
        :disabled="sharing"
        @click="generateShareLink"
      >
        {{ sharing ? 'Generating share link…' : 'Share garden' }}
      </button>
      <ul
        v-if="shares.length > 0"
        class="space-y-1"
        aria-label="Share links"
      >
        <li
          v-for="share in shares"
          :key="share.id"
          class="paper-card p-2 text-xs text-ink-700"
        >
          <div class="flex items-start gap-2">
            <a
              class="min-w-0 flex-1 break-all text-sage-800 hover:text-sage-800 underline"
              :href="absoluteShareUrl(share.url)"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ absoluteShareUrl(share.url) }}
            </a>
            <button
              type="button"
              class="btn-soft-muted btn-soft-sm shrink-0 px-1.5 py-0.5 text-ink-700"
              :aria-label="`Revoke share link ${absoluteShareUrl(share.url)}`"
              :disabled="revokingShareId === share.id"
              @click="revokeShare(share.id)"
            >
              {{ revokingShareId === share.id ? 'Revoking…' : 'Revoke' }}
            </button>
          </div>
          <p class="mt-1 text-ink-500">Created {{ formatShareDate(share.createdAt) }}</p>
        </li>
      </ul>
      <p
        v-if="shareError"
        class="text-xs text-red-700"
        role="alert"
      >
        {{ shareError }}
      </p>
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
