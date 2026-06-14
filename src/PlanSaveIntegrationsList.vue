<script setup lang="ts">
  import { storeToRefs } from 'pinia';

  import UiIcon from './uiIcons/UiIcon.vue';
  import { planSaveStatusLabel } from './planSaveIntegration';
  import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';

  const planSaveCoordinator = usePlanSaveCoordinator();
  const { views, hasUnsavedChanges } = storeToRefs(planSaveCoordinator);

  const statusClass = (status: string): string => {
    switch (status) {
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
    <ul
      class="space-y-1"
      aria-label="Save destinations"
    >
      <li
        v-for="row in views"
        :key="row.id"
        class="paper-card text-xs text-ink-700"
      >
        <div class="flex items-center gap-1 p-2">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1 text-left font-medium text-ink-800 hover:text-ink-950"
            :aria-expanded="planSaveCoordinator.isExpanded(row.id)"
            @click="planSaveCoordinator.toggleExpanded(row.id)"
          >
            <UiIcon
              name="chevron-down"
              class="size-3.5 shrink-0 transition-transform"
              :class="{ 'rotate-180': planSaveCoordinator.isExpanded(row.id) }"
            />
            <span class="truncate">{{ row.label }}</span>
          </button>
          <span
            class="shrink-0 font-medium"
            :class="statusClass(row.status)"
          >
            {{ planSaveStatusLabel(row.status) }}
          </span>
          <button
            v-if="row.status === 'error'"
            type="button"
            class="btn-soft-muted btn-soft-sm shrink-0 px-1.5 py-0.5 text-ink-700"
            :aria-label="`Retry save to ${row.label}`"
            @click="planSaveCoordinator.retry(row.id)"
          >
            ↻
          </button>
        </div>
        <div
          v-if="planSaveCoordinator.isExpanded(row.id)"
          class="border-t border-parchment-400/50 px-2 pb-2 pt-1 space-y-1"
        >
          <template
            v-for="(detail, index) in row.details"
            :key="`${row.id}-${index}`"
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
            v-if="row.errorMessage"
            class="text-red-700"
            role="alert"
          >
            {{ row.errorMessage }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
