<script lang="ts" setup>
import { ICON_SYMBOL_TRANSFORM } from '../icons/iconGeometry';
import { PLANT_ICON_IDS } from './iconIds';
import { PLANT_ICON_SYMBOL_INNER } from './symbolMarkup';
</script>
<template>
  <!-- eslint-disable vue/no-v-html -->
  <svg
    aria-hidden="true"
    width="0"
    height="0"
    class="absolute overflow-hidden"
  >
    <defs>
      <symbol
        v-for="id in PLANT_ICON_IDS"
        :id="`plant-icon-${id}`"
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
            v-html="PLANT_ICON_SYMBOL_INNER[id]"
          />
        </g>
      </symbol>
    </defs>
  </svg>
</template>
