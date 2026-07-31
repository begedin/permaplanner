<script lang="ts" setup>
  import GuildListRow from './GuildListRow.vue';

  defineProps<{
    id: string;
    fillCell?: boolean;
  }>();
</script>

<template>
  <GuildListRow
    :guild-id="id"
    :fill-cell="fillCell"
  />
</template>
