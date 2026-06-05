<script setup lang="ts">
  import { onBeforeUnmount, ref, watch } from 'vue';

  import {
    getGithubAccessToken,
    listGithubPlansInRepo,
    type GithubPlanListEntry,
  } from './githubRepoSync';
  import { githubSaveFailureMessage } from './planSaveIntegrations/github';
  import { usePlanSession } from './usePlanSession';

  const open = defineModel<boolean>('open', { default: false });

  const { restorePlanFromGithub, saveLocalCopy } = usePlanSession();

  const loading = ref(false);
  const openingPlan = ref<string | undefined>();
  const plans = ref<GithubPlanListEntry[]>([]);
  const error = ref<string | undefined>();

  const formatTimestamp = (ms: number | undefined): string =>
    ms === undefined ? '—' : new Date(ms).toLocaleString();

  const resetState = () => {
    loading.value = false;
    openingPlan.value = undefined;
    plans.value = [];
    error.value = undefined;
  };

  const fetchPlans = async () => {
    const token = getGithubAccessToken();
    if (!token) {
      error.value = 'Connect to GitHub before opening a plan from the repo.';
      return;
    }
    loading.value = true;
    error.value = undefined;
    try {
      plans.value = await listGithubPlansInRepo(token);
    } catch (e) {
      error.value = githubSaveFailureMessage(e);
    } finally {
      loading.value = false;
    }
  };

  watch(
    () => open.value,
    (isOpen) => {
      if (isOpen) {
        resetState();
        void fetchPlans();
      }
    },
    { immediate: true },
  );

  const close = () => {
    open.value = false;
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open.value && !openingPlan.value) {
      close();
    }
  };

  watch(
    () => open.value,
    (isOpen) => {
      if (isOpen) {
        document.addEventListener('keydown', onKeydown);
      } else {
        document.removeEventListener('keydown', onKeydown);
      }
    },
  );

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
  });

  const selectPlan = async (entry: GithubPlanListEntry) => {
    openingPlan.value = entry.gardenFolderSegment;
    error.value = undefined;
    try {
      await restorePlanFromGithub(entry);
      open.value = false;
      await saveLocalCopy();
    } catch (e) {
      error.value = githubSaveFailureMessage(e);
    } finally {
      openingPlan.value = undefined;
    }
  };
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-parchment-100/95 p-4 overflow-y-auto"
    >
      <button
        type="button"
        class="absolute inset-0 cursor-default"
        aria-label="Close GitHub plan picker"
        :disabled="Boolean(openingPlan)"
        @click="close"
      />
      <div
        class="relative w-full max-w-lg rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-plan-picker-heading"
        @click.stop
      >
        <header class="mb-4">
          <h2
            id="github-plan-picker-heading"
            class="text-xl font-semibold text-ink-800"
          >
            Open plan from GitHub
          </h2>
          <p class="mt-2 text-sm text-ink-600">
            Choose a garden backed up in your private sync repo. You will pick where to
            save a local copy next.
          </p>
        </header>

        <p
          v-if="loading"
          class="text-sm text-ink-600"
          role="status"
          aria-live="polite"
        >
          Loading plans from GitHub…
        </p>

        <p
          v-else-if="!error && plans.length === 0"
          class="text-sm text-ink-600"
        >
          No saved plans found in your GitHub repo yet.
        </p>

        <ul
          v-else-if="plans.length > 0"
          class="space-y-2 max-h-[min(50vh,20rem)] overflow-y-auto"
        >
          <li
            v-for="plan in plans"
            :key="plan.gardenFolderSegment"
          >
            <button
              type="button"
              class="w-full rounded-xl border border-parchment-300/70 px-4 py-3 text-left hover:bg-parchment-50 disabled:opacity-50"
              :disabled="Boolean(openingPlan)"
              @click="selectPlan(plan)"
            >
              <span class="block font-medium text-ink-800">{{
                plan.gardenFolderSegment
              }}</span>
              <span class="mt-1 block text-xs text-ink-500">
                Last saved on GitHub: {{ formatTimestamp(plan.remoteLastUpdatedMs) }}
              </span>
              <span
                v-if="openingPlan === plan.gardenFolderSegment"
                class="mt-1 block text-xs text-ink-600"
              >
                Opening…
              </span>
            </button>
          </li>
        </ul>

        <p
          v-if="error"
          class="mt-3 text-sm text-red-700"
          role="alert"
        >
          {{ error }}
        </p>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="btn-soft-muted px-4 py-2 text-sm disabled:opacity-50"
            :disabled="Boolean(openingPlan)"
            @click="close"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
