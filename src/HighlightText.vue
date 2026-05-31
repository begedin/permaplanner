<script lang="ts" setup>
  import { computed } from 'vue';

  import { highlightSegments } from './guildSearch';

  const props = defineProps<{
    text: string;
    query?: string;
  }>();

  const segments = computed(() => highlightSegments(props.text, props.query ?? ''));
</script>

<template>
  <span>
    <template
      v-for="(segment, index) in segments"
      :key="index"
    >
      <mark
        v-if="segment.match"
        class="search-highlight"
      >
        {{ segment.text }}
      </mark>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
