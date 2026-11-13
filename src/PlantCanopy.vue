<script setup lang="ts">
  import { computed, useId } from 'vue';
  import type { DeepReadonly } from 'vue';
  import type { GardenThing } from './gardenTypes';
  import { useGardenStore } from './useGardenStore';

  const props = defineProps<{ thing: DeepReadonly<GardenThing>; selected?: boolean }>();
  const garden = useGardenStore();
  const clipId = useId();
  const kind = computed(() => {
    const layers = garden.resolvedPlant(props.thing.plantId).layers;
    if (layers.includes('overstory') || layers.includes('understory')) return 'tree';
    return layers.includes('shrub') ? 'shrub' : 'plant';
  });
  const outline = computed(() => {
    if (kind.value === 'tree')
      return 'M -.96 -.08 C -1.15 -.27 -1 -.55 -.77 -.54 C -.87 -.84 -.56 -1.02 -.35 -.85 C -.22 -1.14 .13 -1.06 .24 -.86 C .52 -1.02 .79 -.83 .73 -.59 C 1.04 -.65 1.15 -.29 .94 -.12 C 1.17 .06 1.01 .4 .79 .41 C .91 .69 .64 .96 .4 .81 C .23 1.09 -.08 1.04 -.19 .85 C -.42 1.02 -.7 .85 -.65 .64 C -.94 .69 -1.13 .4 -.91 .23 C -1.1 .18 -1.13 .01 -.96 -.08 Z';
    if (kind.value === 'shrub')
      return 'M -.86 -.24 C -1.04 -.58 -.63 -.87 -.4 -.65 C -.36 -1.04 .16 -1.02 .3 -.7 C .57 -.9 .95 -.65 .79 -.35 C 1.18 -.18 1 .28 .73 .31 C .97 .62 .55 .95 .3 .75 C .1 1.13 -.31 1.03 -.4 .73 C -.77 .94 -1.04 .58 -.81 .35 C -1.15 .25 -1.1 -.15 -.86 -.24 Z';
    return 'M -.06 -.2 Q -.43 -.55 -.23 -.98 Q .17 -.82 .16 -.3 Q .46 -.76 .91 -.63 Q .87 -.13 .35 .04 Q .85 .14 .88 .65 Q .39 .75 .08 .3 Q .22 .78 -.15 1 Q -.53 .76 -.3 .28 Q -.76 .65 -1 .32 Q -.84 -.13 -.35 -.07 Q -.89 -.23 -.82 -.73 Q -.35 -.83 -.06 -.2 Z';
  });
  // Stable variation keeps an individual's silhouette unchanged across moves and reloads.
  const rotation = computed(() => {
    let hash = 0;
    for (const char of props.thing.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return Math.abs(hash % 360);
  });
  const foliage = [
    { x: -0.48, y: -0.38, size: 0.42, angle: 18 },
    { x: 0.12, y: -0.51, size: 0.48, angle: 83 },
    { x: 0.55, y: -0.1, size: 0.4, angle: 142 },
    { x: 0.28, y: 0.48, size: 0.45, angle: 221 },
    { x: -0.4, y: 0.36, size: 0.5, angle: 274 },
    { x: -0.06, y: -0.02, size: 0.39, angle: 321 },
  ];
</script>

<template>
  <g
    :transform="`translate(${thing.x + thing.width / 2} ${thing.y + thing.height / 2}) scale(${thing.width / 2} ${thing.height / 2})`"
    :class="`canopy canopy--${kind}`"
  >
    <title>{{ thing.nameOrCultivar }}</title>
    <circle
      r="1"
      fill="transparent"
    />
    <g :transform="`rotate(${rotation})`">
      <defs>
        <clipPath :id="clipId"><path :d="outline" /></clipPath>
      </defs>
      <path
        :d="outline"
        fill="currentColor"
        fill-opacity=".72"
      />
      <g :clip-path="`url(#${clipId})`">
        <path
          v-for="(patch, index) in foliage"
          :key="index"
          :d="outline"
          :transform="`translate(${patch.x} ${patch.y}) rotate(${patch.angle}) scale(${patch.size})`"
          :fill="index % 2 ? '#e1e7ac' : 'currentColor'"
          :fill-opacity="index % 2 ? 0.18 : 0.25"
          stroke="#e1e7ac"
          stroke-opacity=".35"
          stroke-width=".045"
        />
        <path
          d="M -.08 .18 Q .01 -.03 -.12 -.62 M -.04 -.16 Q -.31 -.34 -.58 -.33 M -.03 .04 Q .25 -.1 .59 -.4 M .27 -.19 L .23 -.47 M -.08 .18 Q .27 .24 .48 .58 M .24 .3 L .52 .24 M -.08 .18 Q -.39 .28 -.54 .62"
          fill="none"
          stroke="#f2f0c8"
          stroke-opacity=".55"
          stroke-width=".025"
          stroke-linecap="round"
        />
      </g>
      <path
        :d="outline"
        fill="none"
        :stroke="selected ? '#a65b23' : 'currentColor'"
        :stroke-width="selected ? 2.5 : 1"
        vector-effect="non-scaling-stroke"
        :stroke-dasharray="selected ? '4 3' : undefined"
      />
    </g>
  </g>
</template>

<style scoped>
  .canopy--tree {
    color: #3f6846;
  }
  .canopy--shrub {
    color: #74854a;
  }
  .canopy--plant {
    color: #9b9850;
  }
</style>
