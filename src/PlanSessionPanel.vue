<script setup lang="ts">
  import { toRef } from 'vue';
  import { useRouter } from 'vue-router';

  import { useGardenShares } from './useGardenShares';
  import { exportActiveGardenJson } from './exportGardenJson';
  import { buildGardenShareJsonText } from './gardenShareExport';
  import PlanSaveStatus from './PlanSaveStatus.vue';
  import { useAuthStore } from './stores/useAuthStore';
  import { routeNames } from './router';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';

  const auth = useAuthStore();
  const router = useRouter();
  const gardenSession = useGardenSessionStore();

  const { state, generateShareLink, revokeShare } = useGardenShares(
    toRef(gardenSession, 'gardenId'),
  );

  const formatShareDate = (iso: string): string => new Date(iso).toLocaleString();

  const absoluteShareUrl = (path: string): string =>
    new URL(path, window.location.origin).href;

  const shareJsonPath = (path: string): string => `${path}.json`;

  const copyShareLink = async (path: string, kind: 'HTML' | 'JSON') => {
    state.value.error = undefined;
    try {
      await navigator.clipboard.writeText(absoluteShareUrl(path));
    } catch (e) {
      state.value.error =
        e instanceof Error ? e.message : `Could not copy ${kind} share link`;
    }
  };

  const copyGuildJson = async () => {
    state.value.error = undefined;
    try {
      const gardenName = gardenSession.gardenName?.trim() || 'garden';
      const text = buildGardenShareJsonText(gardenName, gardenSession.snapshot());
      await navigator.clipboard.writeText(text);
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : 'Could not copy guild JSON';
    }
  };

  const logout = async () => {
    if (!gardenSession.confirmLeave()) return;
    await auth.logout();
    gardenSession.reset();
    await router.replace({ name: routeNames.login });
  };
</script>

<template>
  <div class="flex flex-1 flex-col items-stretch gap-2">
    <PlanSaveStatus />
    <span
      v-if="gardenSession.gardenName"
      class="text-xs text-ink-600 truncate"
      >{{ gardenSession.gardenName }}</span
    >
    <div class="grid grid-cols-2 gap-2">
      <template v-if="gardenSession.gardenName">
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
          aria-label="Copy JSON"
          @click="copyGuildJson"
        >
          Copy JSON
        </button>
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
          :disabled="state.sharing"
          @click="generateShareLink"
        >
          {{ state.sharing ? 'Generating share link…' : 'Share Garden' }}
        </button>
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800"
          @click="exportActiveGardenJson"
        >
          Export JSON
        </button>
      </template>
      <RouterLink
        class="btn-soft-muted btn-soft-sm w-full p-1.5 text-sm text-ink-800 text-center"
        :to="{ name: routeNames.import }"
      >
        Import JSON
      </RouterLink>
    </div>
    <template v-if="gardenSession.gardenName">
      <ul
        v-if="state.shares.length > 0"
        class="space-y-1"
        aria-label="Share links"
      >
        <li
          v-for="share in state.shares"
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
              :disabled="state.revoking.has(share.id)"
              @click="revokeShare(share.id)"
            >
              {{ state.revoking.has(share.id) ? 'Revoking…' : 'Revoke' }}
            </button>
          </div>
          <div class="mt-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              class="btn-soft-muted btn-soft-sm px-1.5 py-0.5 text-ink-700"
              :aria-label="`Copy HTML share link ${absoluteShareUrl(share.url)}`"
              @click="copyShareLink(share.url, 'HTML')"
            >
              Copy HTML link
            </button>
            <button
              type="button"
              class="btn-soft-muted btn-soft-sm px-1.5 py-0.5 text-ink-700"
              :aria-label="`Copy JSON share link ${absoluteShareUrl(shareJsonPath(share.url))}`"
              @click="copyShareLink(shareJsonPath(share.url), 'JSON')"
            >
              Copy JSON link
            </button>
          </div>
          <p class="mt-1 text-ink-500">Created {{ formatShareDate(share.createdAt) }}</p>
        </li>
      </ul>
      <p
        v-if="state.error"
        class="text-xs text-red-700"
        role="alert"
      >
        {{ state.error }}
      </p>
    </template>

    <div class="mt-auto flex flex-col gap-2 pt-4">
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
  </div>
</template>
