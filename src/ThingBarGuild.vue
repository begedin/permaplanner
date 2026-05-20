<script lang="ts" setup>
import GuildCard from './GuildCard.vue';

defineProps<{
  id: string;
  fillCell?: boolean;
}>();
</script>

<template>
  <GuildCard
    :guild-id="id"
    context="aerialSidebar"
    :fill-cell="fillCell"
  />
</template>
