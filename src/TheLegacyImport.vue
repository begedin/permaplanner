<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';

  import { pickAndImportLocalFile } from './legacyImport/localFile';
  import { routeNames } from './router';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { useGardenSession } from './useGardenSession';

  const router = useRouter();
  const gardenSession = useGardenSessionStore();
  const { createEmptyGarden, activateGarden } = useGardenSession();

  const actionError = ref<string | undefined>();

  const importLocalFile = async () => {
    actionError.value = undefined;
    try {
      const garden = await pickAndImportLocalFile();
      await gardenSession.refreshList();
      gardenSession.setActiveGardenId(garden.id);
      await activateGarden(garden.id);
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  const startEmpty = async () => {
    actionError.value = undefined;
    try {
      await createEmptyGarden('My garden');
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-6 bg-parchment-100">
    <div
      class="w-full max-w-lg rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-8"
    >
      <header class="text-center mb-6">
        <h1 class="text-xl font-semibold text-ink-800">Set up your garden</h1>
        <p class="mt-2 text-ink-600">
          Import an existing plan or start with an empty garden.
        </p>
      </header>

      <section class="space-y-3">
        <button
          type="button"
          class="w-full btn-soft-primary px-4 py-3 font-medium text-left"
          @click="importLocalFile"
        >
          Import JSON file…
        </button>
        <button
          type="button"
          class="w-full btn-soft-secondary px-4 py-3 font-medium text-left"
          @click="startEmpty"
        >
          Create empty garden
        </button>
      </section>

      <p
        v-if="actionError"
        class="mt-4 text-sm text-red-700"
        role="alert"
      >
        {{ actionError }}
      </p>
    </div>
  </div>
</template>
