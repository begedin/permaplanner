<script setup lang="ts">
  import { storeToRefs } from 'pinia';

  import UiIcon from './uiIcons/UiIcon.vue';
  import { planSaveStatusLabel, usePlanSaveCoordinator } from './usePlanSaveCoordinator';

  const planSaveCoordinator = usePlanSaveCoordinator();
  const { status, errorMessage, details, detailsExpanded, hasUnsavedChanges } =
    storeToRefs(planSaveCoordinator);

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
  <div class="space-y-2">
    <p
      v-if="hasUnsavedChanges"
      class="px-1.5 py-1 rounded-lg text-xs font-medium text-amber-900 bg-amber-100/90 border border-amber-200/60"
      role="status"
      aria-live="polite"
    >
      Unsaved changes
    </p>
    <div
      v-if="status !== 'inactive'"
      class="paper-card text-xs text-ink-700"
    >
      <div class="flex items-center gap-1 p-2">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-1 text-left font-medium text-ink-800 hover:text-ink-950"
          :aria-expanded="detailsExpanded"
          @click="planSaveCoordinator.toggleDetailsExpanded()"
        >
          <UiIcon
            name="chevron-down"
            class="size-3.5 shrink-0 transition-transform"
            :class="{ 'rotate-180': detailsExpanded }"
          />
          <span class="truncate">Permaplanner cloud</span>
        </button>
        <span
          class="shrink-0 font-medium"
          :class="statusClass(status)"
        >
          {{ planSaveStatusLabel(status) }}
        </span>
        <button
          v-if="status === 'error'"
          type="button"
          class="btn-soft-muted btn-soft-sm shrink-0 px-1.5 py-0.5 text-ink-700"
          aria-label="Retry save to Permaplanner cloud"
          @click="planSaveCoordinator.retry()"
        >
          ↻
        </button>
      </div>
      <div
        v-if="detailsExpanded"
        class="border-t border-parchment-400/50 px-2 pb-2 pt-1 space-y-1"
      >
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
      </div>
    </div>
  </div>
</template>
