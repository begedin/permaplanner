<script setup lang="ts">
  import { storeToRefs } from 'pinia';

  import {
    useGardenSessionStore,
    type PlanSaveStatus,
  } from './stores/useGardenSessionStore';

  const gardenSession = useGardenSessionStore();
  const { status, errorMessage, details, hasUnsavedChanges } = storeToRefs(gardenSession);

  const STATUS_LABEL: Record<PlanSaveStatus, string> = {
    inactive: 'Off',
    unsaved: 'Unsaved',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Failed',
  };

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
          {{ STATUS_LABEL[status] }}
        </span>
        <button
          v-if="status === 'error'"
          type="button"
          class="btn-soft-muted btn-soft-sm shrink-0 px-1.5 py-0.5 text-ink-700"
          aria-label="Retry save"
          @click="gardenSession.save()"
        >
          ↻
        </button>
      </div>
      <p
        v-for="detail in details"
        :key="detail.label"
        class="text-ink-600"
      >
        {{ detail.label }}:
        <strong class="text-ink-800">{{ detail.value }}</strong>
      </p>
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
