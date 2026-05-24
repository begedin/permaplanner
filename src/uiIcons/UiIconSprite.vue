<script lang="ts" setup>
import { ICON_SYMBOL_TRANSFORM } from '../icons/iconGeometry';
import { UI_ICON_IDS } from './iconIds';
import { UI_ICON_SYMBOL_INNER } from './symbolMarkup';
</script>
<template>
  <svg
    aria-hidden="true"
    width="0"
    height="0"
    class="absolute overflow-hidden"
  >
    <defs>
      <!-- eslint-disable vue/no-v-html -->
      <symbol
        v-for="id in UI_ICON_IDS"
        :id="`ui-icon-${id}`"
        :key="id"
        viewBox="0 0 48 48"
        width="48"
        height="48"
      >
        <g
          :transform="ICON_SYMBOL_TRANSFORM"
          vector-effect="non-scaling-stroke"
        >
          <g
            fill="none"
            stroke="#3d2f24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            v-html="UI_ICON_SYMBOL_INNER[id]"
          />
        </g>
      </symbol>
    </defs>
  </svg>
</template>
