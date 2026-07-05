<script setup lang="ts">
  import { onMounted } from 'vue';
  import { storeToRefs } from 'pinia';

  import { planSaveStatusLabel, usePlanSaveCoordinator } from './usePlanSaveCoordinator';

  const planSaveCoordinator = usePlanSaveCoordinator();
  const { status, errorMessage, details, hasUnsavedChanges } =
    storeToRefs(planSaveCoordinator);

  onMounted(() => {
    void planSaveCoordinator.refreshDetails();
  });

  const statusClass = (value: string): string => {
    switch (value) {
      case 'unsaved':
        return 'text-amber-900';
      case 'saving':
        return 'text-ink-600';
      case 'saved':
        return 'text-sage-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-ink-500';
    }
  };
</script>

<template>
  <div
    v-if="status !== 'inactive' || hasUnsavedChanges"
    class="space-y-1 text-xs text-ink-700"
  >
    <p
      v-if="hasUnsavedChanges"
      class="px-1.5 py-1 rounded-lg text-xs font-medium text-amber-900 bg-amber-100/90 border border-amber-200/60"
      role="status"
      aria-live="polite"
    >
      Unsaved changes
    </p>
    <template v-if="status !== 'inactive'">
      <div class="flex items-center gap-2">
        <span
          class="font-medium"
          :class="statusClass(status)"
        >
          {{ planSaveStatusLabel(status) }}
        </span>
        <button
          v-if="status === 'error'"
          type="button"
          class="btn-soft-muted btn-soft-sm shrink-0 px-1.5 py-0.5 text-ink-700"
          aria-label="Retry save"
          @click="planSaveCoordinator.retry()"
        >
          ↻
        </button>
      </div>
      <template
        v-for="(detail, index) in details"
        :key="index"
      >
        <p
          v-if="detail.kind === 'text'"
          class="text-ink-600"
        >
          {{ detail.label }}:
          <strong class="text-ink-800">{{ detail.value }}</strong>
        </p>
        <p v-else-if="detail.kind === 'link'">
          <a
            class="text-sage-800 hover:text-sage-800 underline break-all"
            :href="detail.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ detail.label }}
          </a>
        </p>
      </template>
      <p
        v-if="errorMessage"
        class="text-red-700"
        role="alert"
      >
        {{ errorMessage }}
      </p>
    </template>
  </div>
</template>
