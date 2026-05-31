<script setup lang="ts">
  import { computed } from 'vue';

  import GithubPlanSyncRepoNote from './GithubPlanSyncRepoNote.vue';
  import PlanMigrationScreen from './PlanMigrationScreen.vue';
  import { beginGithubAuth, readGithubClientIdConfig } from './githubRepoSync';
  import { planAppGateMode } from './usePlanAppGate';
  import { usePlanSession } from './usePlanSession';
  import { usePermaplannerStore } from './usePermaplannerStore';

  const mode = planAppGateMode;

  const permaplannerStore = usePermaplannerStore();
  const githubClientConfigured = computed(() => Boolean(readGithubClientIdConfig()));

  const {
    awaitingReopenFileClick,
    expectedRelinkName,
    continueReopenPersistedFile,
    load,
    newPlan,
  } = usePlanSession();

  const connectGithub = () => {
    void beginGithubAuth();
  };
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-parchment-100/95 p-4 overflow-y-auto"
    role="presentation"
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-6 sm:p-8"
      role="dialog"
      :aria-labelledby="
        mode === 'migration' ? 'plan-migration-heading' : 'plan-gate-heading'
      "
      aria-modal="true"
    >
      <template v-if="mode === 'loading'">
        <div class="text-center py-8">
          <p
            id="plan-gate-heading"
            class="text-lg font-medium text-ink-700 animate-pulse"
            role="status"
            aria-live="polite"
          >
            Loading your plan…
          </p>
        </div>
      </template>

      <PlanMigrationScreen v-else-if="mode === 'migration'" />

      <template v-else-if="mode === 'setup'">
        <header class="text-center mb-6">
          <h1
            id="plan-gate-heading"
            class="text-xl font-semibold text-ink-800"
          >
            Choose where to save your plan
          </h1>
          <p class="mt-2 text-ink-600">
            Permaplanner keeps your garden in a file on your device or in a private GitHub
            repo. Pick one to get started.
          </p>
        </header>

        <div
          v-if="awaitingReopenFileClick"
          class="mb-5 p-4 rounded-xl bg-blossom-50/90 border border-lavender-200/70 text-sm text-lavender-700"
        >
          <p class="font-medium">Restore your last plan file</p>
          <p
            v-if="expectedRelinkName"
            class="mt-1"
          >
            <code class="text-xs bg-parchment-50 px-1 rounded">{{
              expectedRelinkName
            }}</code>
          </p>
          <p class="mt-2 text-lavender-700/90">
            Your browser needs a click to allow file access after you reload the page.
          </p>
          <button
            type="button"
            class="mt-3 w-full btn-soft-lavender px-4 py-2.5 font-medium"
            @click="continueReopenPersistedFile"
          >
            Allow access and open
          </button>
        </div>

        <div
          v-else-if="permaplannerStore.needsFileRelink"
          class="mb-5 p-4 rounded-xl bg-amber-50/90 border border-amber-200/70 text-sm text-amber-950"
        >
          <p class="font-medium">Re-link your plan file</p>
          <p
            v-if="expectedRelinkName"
            class="mt-1"
          >
            Last file:
            <code class="text-xs bg-parchment-50 px-1 rounded">{{
              expectedRelinkName
            }}</code>
          </p>
          <button
            type="button"
            class="mt-3 w-full btn-soft-amber px-4 py-2.5 font-medium"
            @click="load"
          >
            Choose file…
          </button>
        </div>

        <section class="space-y-3">
          <h2 class="text-sm font-medium text-ink-700">Save on this device</h2>
          <button
            type="button"
            class="w-full btn-soft-primary px-4 py-3 font-medium text-left"
            @click="newPlan"
          >
            Create new plan…
          </button>
          <button
            type="button"
            class="w-full btn-soft-secondary px-4 py-3 font-medium text-left"
            @click="load"
          >
            Open existing plan…
          </button>
        </section>

        <div
          class="my-6 flex items-center gap-3 text-xs text-ink-400 uppercase tracking-wide"
          aria-hidden="true"
        >
          <span class="flex-1 border-t border-parchment-300" />
          <span>or</span>
          <span class="flex-1 border-t border-parchment-300" />
        </div>

        <section class="space-y-3">
          <h2 class="text-sm font-medium text-ink-700">Save with GitHub</h2>
          <p
            v-if="!githubClientConfigured"
            class="text-sm text-amber-800"
          >
            GitHub sign-in is not configured for this build.
          </p>
          <GithubPlanSyncRepoNote v-if="githubClientConfigured" />
          <button
            v-if="githubClientConfigured"
            type="button"
            class="w-full btn-soft-ink px-4 py-3 font-medium text-left"
            @click="connectGithub"
          >
            Connect GitHub
          </button>
        </section>
      </template>
    </div>
  </div>
</template>
