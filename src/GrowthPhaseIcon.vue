<script lang="ts" setup>
  import { ICON_CANVAS, ICON_SYMBOL_TRANSFORM } from './icons/iconGeometry';
  import { GROWTH_PHASE_LABEL, type GrowthPhase } from './guildPlantInstanceStatus';

  defineProps<{
    phase: GrowthPhase;
  }>();
</script>
<template>
  <svg
    :viewBox="`0 0 ${ICON_CANVAS} ${ICON_CANVAS}`"
    class="block aspect-square shrink-0 size-4 text-sage-700"
    :aria-label="`Phase: ${GROWTH_PHASE_LABEL[phase]}`"
    :title="GROWTH_PHASE_LABEL[phase]"
    role="img"
  >
    <g :transform="ICON_SYMBOL_TRANSFORM">
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <template v-if="phase === 'sown'">
          <path d="M10 36 L38 36" />
          <circle
            cx="24"
            cy="32"
            r="3"
            fill="currentColor"
            stroke="none"
          />
        </template>
        <template v-else-if="phase === 'germinated'">
          <path d="M10 36 L38 36" />
          <path d="M24 36 L24 30" />
          <path d="M18 28 Q24 22 30 28" />
        </template>
        <template v-else-if="phase === 'transplanted'">
          <path d="M10 36 L38 36" />
          <path d="M17 36 L20 28 L28 28 L31 36" />
          <path d="M24 28 L24 22" />
          <path d="M20 20 Q24 16 28 20" />
        </template>
        <template v-else-if="phase === 'young'">
          <path d="M10 36 L38 36" />
          <path d="M24 36 L24 26" />
          <path d="M16 24 Q24 18 32 24" />
          <path d="M19 28 L24 24 L29 28" />
        </template>
        <template v-else-if="phase === 'established'">
          <path d="M10 36 L38 36" />
          <path d="M24 36 L24 20" />
          <path d="M12 22 Q24 10 36 22" />
          <path d="M14 28 Q24 20 34 28" />
        </template>
        <template v-else-if="phase === 'producing'">
          <path d="M10 36 L38 36" />
          <path d="M24 36 L24 22" />
          <path d="M14 24 Q24 14 34 24" />
          <circle
            cx="24"
            cy="12"
            r="4"
            fill="currentColor"
            stroke="none"
          />
        </template>
        <template v-else>
          <path d="M10 36 L38 36" />
          <path d="M24 36 L24 24" />
          <path d="M16 26 Q24 18 32 26" />
          <path d="M20 18 L28 18" />
        </template>
      </g>
    </g>
  </svg>
</template>
