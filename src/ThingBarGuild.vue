<script lang="ts" setup>
import GuildCard from './GuildCard.vue';

defineProps<{
  id: string;
}>();
</script>

<template>
  <GuildCard
    :guild-id="id"
    context="aerialSidebar"
  />
</template>
