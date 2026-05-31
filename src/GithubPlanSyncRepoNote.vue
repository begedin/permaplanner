<script setup lang="ts">
  import { GITHUB_PLAN_SYNC_REPO_NAME } from './githubRepoSync';

  withDefaults(
    defineProps<{
      size?: 'sm' | 'xs';
    }>(),
    { size: 'sm' },
  );

  const plansFolderPath = 'plans/<garden-name>/';
</script>

<template>
  <p :class="size === 'xs' ? 'text-xs text-ink-600' : 'text-sm text-ink-600'">
    Creates or reuses a private repo
    <code class="bg-parchment-50 px-0.5 rounded text-ink-800">
      {{ GITHUB_PLAN_SYNC_REPO_NAME }}
    </code>
    on your GitHub account. Each garden syncs under
    <code class="bg-parchment-50 px-0.5 rounded text-ink-800">
      {{ plansFolderPath }}
    </code>
    .
  </p>
</template>
